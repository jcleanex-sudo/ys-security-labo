//+------------------------------------------------------------------+
//| AIFXLAB_LiveCsvBridge.mq5                                       |
//| Signal-only live CSV bridge for AI FX LAB.                       |
//| This EA does not send, modify, or close orders.                  |
//+------------------------------------------------------------------+
#property strict
#property version   "1.00"
#property description "Exports the latest MT5 bars to CSV on a timer for AI FX LAB."
#property description "Signal-only bridge. No CTrade, no broker actions."

input string          InpSymbol            = "";
input ENUM_TIMEFRAMES InpTimeframe         = PERIOD_H1;
input int             InpBarsToExport      = 500;
input int             InpUpdateSeconds     = 3;
input bool            InpUseChartSymbol    = true;
input bool            InpUseChartTimeframe = true;

string ActiveSymbol()
{
   if(InpUseChartSymbol || StringLen(InpSymbol) == 0)
      return _Symbol;

   return InpSymbol;
}

ENUM_TIMEFRAMES ActiveTimeframe()
{
   if(InpUseChartTimeframe)
      return (ENUM_TIMEFRAMES)_Period;

   return InpTimeframe;
}

string TimeframeToText(ENUM_TIMEFRAMES timeframe)
{
   switch(timeframe)
   {
      case PERIOD_M1:  return "M1";
      case PERIOD_M2:  return "M2";
      case PERIOD_M3:  return "M3";
      case PERIOD_M4:  return "M4";
      case PERIOD_M5:  return "M5";
      case PERIOD_M6:  return "M6";
      case PERIOD_M10: return "M10";
      case PERIOD_M12: return "M12";
      case PERIOD_M15: return "M15";
      case PERIOD_M20: return "M20";
      case PERIOD_M30: return "M30";
      case PERIOD_H1:  return "H1";
      case PERIOD_H2:  return "H2";
      case PERIOD_H3:  return "H3";
      case PERIOD_H4:  return "H4";
      case PERIOD_H6:  return "H6";
      case PERIOD_H8:  return "H8";
      case PERIOD_H12: return "H12";
      case PERIOD_D1:  return "D1";
      case PERIOD_W1:  return "W1";
      case PERIOD_MN1: return "MN1";
      default:         return IntegerToString((int)timeframe);
   }
}

string SafeSymbol(string symbol)
{
   string value = symbol;
   StringReplace(value, "/", "");
   StringReplace(value, "\\", "");
   StringReplace(value, ":", "");
   StringReplace(value, ".", "");
   StringReplace(value, " ", "");
   return value;
}

string CsvTime(datetime value)
{
   string text = TimeToString(value, TIME_DATE | TIME_MINUTES);
   StringReplace(text, ".", "-");
   return text;
}

int DigitsForSymbol(string symbol)
{
   long digits = 0;
   if(SymbolInfoInteger(symbol, SYMBOL_DIGITS, digits))
      return (int)digits;

   return _Digits;
}

bool ExportLiveCsv()
{
   string symbol = ActiveSymbol();
   ENUM_TIMEFRAMES timeframe = ActiveTimeframe();
   int barsToExport = MathMax(InpBarsToExport, 10);
   MqlRates rates[];

   int copied = CopyRates(symbol, timeframe, 0, barsToExport, rates);
   if(copied <= 0)
   {
      PrintFormat("AI FX LAB Live CSV: CopyRates failed for %s %s. Error=%d", symbol, TimeframeToText(timeframe), GetLastError());
      return false;
   }

   ArraySetAsSeries(rates, false);

   string fileName = "AIFXLAB_LIVE_" + SafeSymbol(symbol) + "_" + TimeframeToText(timeframe) + ".csv";
   int handle = FileOpen(fileName, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');

   if(handle == INVALID_HANDLE)
   {
      PrintFormat("AI FX LAB Live CSV: FileOpen failed. Error=%d", GetLastError());
      return false;
   }

   int digits = DigitsForSymbol(symbol);
   FileWrite(handle, "time", "open", "high", "low", "close", "volume");

   for(int index = 0; index < copied; index++)
   {
      FileWrite(
         handle,
         CsvTime(rates[index].time),
         DoubleToString(rates[index].open, digits),
         DoubleToString(rates[index].high, digits),
         DoubleToString(rates[index].low, digits),
         DoubleToString(rates[index].close, digits),
         (long)rates[index].tick_volume
      );
   }

   FileClose(handle);
   PrintFormat("AI FX LAB Live CSV updated: %s / %d bars", fileName, copied);
   return true;
}

int OnInit()
{
   int seconds = MathMax(InpUpdateSeconds, 1);
   EventSetTimer(seconds);
   ExportLiveCsv();
   PrintFormat("AI FX LAB Live CSV Bridge started. Update interval: %d seconds", seconds);
   Print("Open MT5: File > Open Data Folder > MQL5 > Files");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("AI FX LAB Live CSV Bridge stopped.");
}

void OnTick()
{
   // Timer-based export keeps file updates stable even when ticks are sparse.
}

void OnTimer()
{
   ExportLiveCsv();
}
