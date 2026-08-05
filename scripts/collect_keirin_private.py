#!/usr/bin/env python3
"""Low-frequency, local-only KEIRIN.JP snapshot collector.

This tool deliberately fetches exactly one user-selected page per invocation.
It does not crawl links, run concurrently, publish data, or update the public site.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path


ALLOWED_HOSTS = {"keirin.jp", "www.keirin.jp"}
ALLOWED_PATH_PREFIXES = ("/pc/", "/sp/")
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[1] / "private_keirin_data"
DEFAULT_MIN_INTERVAL_SECONDS = 90
ABSOLUTE_MIN_INTERVAL_SECONDS = 60
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
USER_AGENT = "KEIRIN-EDGE-LAB-private-research/0.1"


class SimpleTableParser(HTMLParser):
    """Extract visible text from HTML tables without third-party packages."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[list[list[str]]] = []
        self._table: list[list[str]] | None = None
        self._row: list[str] | None = None
        self._cell_parts: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        if tag == "table" and self._table is None:
            self._table = []
        elif tag == "tr" and self._table is not None:
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell_parts = []
        elif tag == "br" and self._cell_parts is not None:
            self._cell_parts.append(" ")

    def handle_data(self, data: str) -> None:
        if self._cell_parts is not None:
            self._cell_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._cell_parts is not None and self._row is not None:
            text = re.sub(r"\s+", " ", "".join(self._cell_parts)).strip()
            self._row.append(text)
            self._cell_parts = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            if any(self._row):
                self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            if self._table:
                self.tables.append(self._table)
            self._table = None


@dataclass(frozen=True)
class FetchResult:
    requested_url: str
    final_url: str
    status: int
    content_type: str
    body: bytes


def validate_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https":
        raise ValueError("HTTPS URLだけを指定してください。")
    if host not in ALLOWED_HOSTS:
        raise ValueError("KEIRIN.JP公式ドメイン以外は取得できません。")
    if not parsed.path.startswith(ALLOWED_PATH_PREFIXES):
        raise ValueError("KEIRIN.JPの /pc/ または /sp/ 配下だけを指定できます。")
    if parsed.username or parsed.password:
        raise ValueError("認証情報を含むURLは指定できません。")
    return urllib.parse.urlunsplit(parsed)


def schedule_url(year_month: str) -> str:
    match = re.fullmatch(r"(20\d{2})-(0[1-9]|1[0-2])", year_month)
    if not match:
        raise ValueError("年月は YYYY-MM 形式で指定してください。")
    year, month = match.groups()
    return f"https://keirin.jp/pc/raceschedule?scym={month}&scyy={year}"


def robots_allows(url: str, timeout: int) -> bool:
    parsed = urllib.parse.urlsplit(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    request = urllib.request.Request(robots_url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read(512 * 1024).decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError(f"robots.txtを確認できないため取得を停止しました: {exc}") from exc
    parser = urllib.robotparser.RobotFileParser()
    parser.set_url(robots_url)
    parser.parse(body.splitlines())
    return parser.can_fetch(USER_AGENT, url)


def enforce_interval(output_dir: Path, min_interval: int) -> None:
    state_path = output_dir / "collector_state.json"
    if not state_path.exists():
        return
    try:
        state = json.loads(state_path.read_text(encoding="utf-8"))
        previous = float(state.get("last_request_epoch", 0))
    except (OSError, ValueError, TypeError):
        raise RuntimeError("取得間隔の状態ファイルが壊れています。確認してから再実行してください。")
    wait_seconds = min_interval - (time.time() - previous)
    if wait_seconds > 0:
        raise RuntimeError(f"低頻度制限中です。あと{int(wait_seconds) + 1}秒待ってください。")


def fetch_one(url: str, timeout: int) -> FetchResult:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        final_url = validate_url(response.geturl())
        content_type = response.headers.get_content_type()
        if content_type not in {"text/html", "application/xhtml+xml"}:
            raise RuntimeError(f"HTML以外の応答は保存しません: {content_type}")
        body = response.read(MAX_RESPONSE_BYTES + 1)
        if len(body) > MAX_RESPONSE_BYTES:
            raise RuntimeError("応答が5MBを超えたため保存を中止しました。")
        return FetchResult(url, final_url, response.status, content_type, body)


def decode_html(body: bytes) -> tuple[str, str]:
    head = body[:4096].decode("ascii", errors="ignore")
    match = re.search(r"charset\s*=\s*[\"']?([A-Za-z0-9._-]+)", head, re.IGNORECASE)
    candidates = [match.group(1)] if match else []
    candidates.extend(["utf-8", "cp932", "euc-jp"])
    for encoding in candidates:
        try:
            return body.decode(encoding), encoding
        except (UnicodeDecodeError, LookupError):
            continue
    return body.decode("utf-8", errors="replace"), "utf-8-replace"


def save_snapshot(
    result: FetchResult,
    output_dir: Path,
    *,
    robots_allowed: bool,
    permission_reference: str | None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y%m%dT%H%M%SZ")
    digest = hashlib.sha256(result.body).hexdigest()
    html_text, encoding = decode_html(result.body)
    parser = SimpleTableParser()
    parser.feed(html_text)

    record_dir = output_dir / stamp
    record_dir.mkdir(exist_ok=False)
    (record_dir / "source.html").write_bytes(result.body)
    metadata = {
        "scope": "PRIVATE_LOCAL_ONLY",
        "publication_allowed": False,
        "robots_allowed": robots_allowed,
        "permission_reference": permission_reference,
        "requested_url": result.requested_url,
        "final_url": result.final_url,
        "fetched_at_utc": now.isoformat(timespec="seconds"),
        "http_status": result.status,
        "content_type": result.content_type,
        "detected_encoding": encoding,
        "bytes": len(result.body),
        "sha256": digest,
        "table_count": len(parser.tables),
    }
    (record_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (record_dir / "tables.json").write_text(
        json.dumps({"tables": parser.tables}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (output_dir / "collector_state.json").write_text(
        json.dumps({"last_request_epoch": time.time(), "last_record": stamp}, indent=2) + "\n",
        encoding="utf-8",
    )
    return record_dir


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="KEIRIN.JPを低頻度で1ページだけローカル保存します。")
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--schedule", metavar="YYYY-MM", help="指定月の公式開催日程を1回取得")
    target.add_argument("--url", help="取得するKEIRIN.JP公式HTTPS URL（1件のみ）")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--min-interval", type=int, default=DEFAULT_MIN_INTERVAL_SECONDS)
    parser.add_argument(
        "--permission-reference",
        help=(
            "robots.txtより優先する取得許可を得ている場合の管理用参照。"
            "許可がない場合は指定しないでください。"
        ),
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.min_interval < ABSOLUTE_MIN_INTERVAL_SECONDS:
        print("ERROR: 取得間隔は60秒未満にできません。", file=sys.stderr)
        return 2
    try:
        url = validate_url(schedule_url(args.schedule) if args.schedule else args.url)
        output_dir = args.output_dir.resolve()
        enforce_interval(output_dir, args.min_interval)
        robots_allowed = robots_allows(url, args.timeout)
        permission_reference = (args.permission_reference or "").strip() or None
        if not robots_allowed and not permission_reference:
            raise RuntimeError("robots.txtで許可されていないURLのため取得を停止しました。")
        result = fetch_one(url, args.timeout)
        record_dir = save_snapshot(
            result,
            output_dir,
            robots_allowed=robots_allowed,
            permission_reference=permission_reference,
        )
    except (ValueError, RuntimeError, urllib.error.URLError, TimeoutError) as exc:
        print(f"DATA BLOCKED: {exc}", file=sys.stderr)
        return 1
    print(json.dumps({"status": "OK", "record_dir": str(record_dir)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
