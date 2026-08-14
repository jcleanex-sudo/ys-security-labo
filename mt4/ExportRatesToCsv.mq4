//+------------------------------------------------------------------+
//| ExportRatesToCsv.mq4                                             |
//| Exports MT4 historical rates for AI FX LAB.                      |
//+------------------------------------------------------------------+
#property strict
#property script_show_inputs

input string InpSymbol = "USDJPY";
input ENUM_TIMEFRAMES InpTimeframe = PERIOD_H1;
input datetime InpStartDate = D'2025.01.01 00:00';
input datetime InpEndDate = D'2025.12.31 23:59';

string TimeframeToText(const ENUM_TIMEFRAMES timeframe)
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
      case PERIOD_MN1: return "MN";
      default:         return IntegerToString((int)timeframe);
   }
}

string DateForFileName(const datetime value)
{
   return TimeToString(value, TIME_DATE);
}

string CleanDateForFileName(const datetime value)
{
   string dateText = DateForFileName(value);
   StringReplace(dateText, ".", "");
   return dateText;
}

string TimeForCsv(const datetime value)
{
   string dateTimeText = TimeToString(value, TIME_DATE | TIME_MINUTES);
   StringReplace(dateTimeText, ".", "-");
   return dateTimeText;
}

void OnStart()
{
   string symbol = InpSymbol;
   StringTrimLeft(symbol);
   StringTrimRight(symbol);
   if(symbol == "")
      symbol = Symbol();

   if(InpEndDate <= InpStartDate)
   {
      Print("End Date must be later than Start Date.");
      return;
   }

   if(!SymbolSelect(symbol, true))
   {
      PrintFormat("SymbolSelect failed: %s / error=%d", symbol, GetLastError());
      return;
   }

   string timeframeText = TimeframeToText(InpTimeframe);
   string fileName = StringFormat(
      "AIFXLAB_%s_%s_%s_%s.csv",
      symbol,
      timeframeText,
      CleanDateForFileName(InpStartDate),
      CleanDateForFileName(InpEndDate)
   );

   int handle = FileOpen(fileName, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(handle == INVALID_HANDLE)
   {
      PrintFormat("FileOpen failed: %s / error=%d", fileName, GetLastError());
      return;
   }

   FileWrite(handle, "time", "open", "high", "low", "close", "volume");

   int digits = (int)MarketInfo(symbol, MODE_DIGITS);
   int exported = 0;
   int totalBars = iBars(symbol, InpTimeframe);

   for(int index = totalBars - 1; index >= 0; index--)
   {
      datetime barTime = iTime(symbol, InpTimeframe, index);
      if(barTime < InpStartDate || barTime > InpEndDate)
         continue;

      FileWrite(
         handle,
         TimeForCsv(barTime),
         DoubleToString(iOpen(symbol, InpTimeframe, index), digits),
         DoubleToString(iHigh(symbol, InpTimeframe, index), digits),
         DoubleToString(iLow(symbol, InpTimeframe, index), digits),
         DoubleToString(iClose(symbol, InpTimeframe, index), digits),
         (long)iVolume(symbol, InpTimeframe, index)
      );
      exported++;
   }

   FileClose(handle);

   PrintFormat("AI FX LAB MT4 CSV exported: %s / %d bars", fileName, exported);
   Print("Open MT4: File > Open Data Folder > MQL4 > Files");
}
