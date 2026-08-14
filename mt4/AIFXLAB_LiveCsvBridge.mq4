//+------------------------------------------------------------------+
//| AIFXLAB_LiveCsvBridge.mq4                                       |
//| Signal-only live CSV bridge for AI FX LAB.                       |
//| This EA does not send, modify, or close orders.                  |
//+------------------------------------------------------------------+
#property strict
#property version   "1.00"
#property description "Exports the latest MT4 bars to CSV on a timer for AI FX LAB."
#property description "Signal-only bridge. No OrderSend, no broker actions."

input string          InpSymbol            = "";
input ENUM_TIMEFRAMES InpTimeframe         = PERIOD_H1;
input int             InpBarsToExport      = 500;
input int             InpUpdateSeconds     = 3;
input bool            InpUseChartSymbol    = true;
input bool            InpUseChartTimeframe = true;

string ActiveSymbol()
{
   if(InpUseChartSymbol || StringLen(InpSymbol) == 0)
      return Symbol();

   return InpSymbol;
}

ENUM_TIMEFRAMES ActiveTimeframe()
{
   if(InpUseChartTimeframe)
      return (ENUM_TIMEFRAMES)Period();

   return InpTimeframe;
}

string TimeframeToText(ENUM_TIMEFRAMES timeframe)
{
   switch(timeframe)
   {
      case PERIOD_M1:  return "M1";
      case PERIOD_M5:  return "M5";
      case PERIOD_M15: return "M15";
      case PERIOD_M30: return "M30";
      case PERIOD_H1:  return "H1";
      case PERIOD_H4:  return "H4";
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

bool ExportLiveCsv()
{
   string symbol = ActiveSymbol();
   ENUM_TIMEFRAMES timeframe = ActiveTimeframe();
   int totalBars = iBars(symbol, timeframe);

   if(totalBars <= 0)
   {
      PrintFormat("AI FX LAB Live CSV: no bars for %s %s", symbol, TimeframeToText(timeframe));
      return false;
   }

   int bars = MathMin(MathMax(InpBarsToExport, 10), totalBars);
   string fileName = "AIFXLAB_LIVE_" + SafeSymbol(symbol) + "_" + TimeframeToText(timeframe) + ".csv";
   int handle = FileOpen(fileName, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');

   if(handle == INVALID_HANDLE)
   {
      PrintFormat("AI FX LAB Live CSV: FileOpen failed. Error=%d", GetLastError());
      return false;
   }

   FileWrite(handle, "time", "open", "high", "low", "close", "volume");

   for(int index = bars - 1; index >= 0; index--)
   {
      datetime barTime = iTime(symbol, timeframe, index);
      if(barTime <= 0)
         continue;

      FileWrite(
         handle,
         CsvTime(barTime),
         DoubleToString(iOpen(symbol, timeframe, index), Digits),
         DoubleToString(iHigh(symbol, timeframe, index), Digits),
         DoubleToString(iLow(symbol, timeframe, index), Digits),
         DoubleToString(iClose(symbol, timeframe, index), Digits),
         (long)iVolume(symbol, timeframe, index)
      );
   }

   FileClose(handle);
   PrintFormat("AI FX LAB Live CSV updated: %s / %d bars", fileName, bars);
   return true;
}

int OnInit()
{
   int seconds = MathMax(InpUpdateSeconds, 1);
   EventSetTimer(seconds);
   ExportLiveCsv();
   PrintFormat("AI FX LAB Live CSV Bridge started. Update interval: %d seconds", seconds);
   Print("Open MT4: File > Open Data Folder > MQL4 > Files");
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
