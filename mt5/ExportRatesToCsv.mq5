//+------------------------------------------------------------------+
//| ExportRatesToCsv.mq5                                             |
//| Exports MT5 historical rates for AI FX LAB.                      |
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
   MqlDateTime dt;
   TimeToStruct(value, dt);
   return StringFormat("%04d%02d%02d", dt.year, dt.mon, dt.day);
}

string TimeForCsv(const datetime value)
{
   MqlDateTime dt;
   TimeToStruct(value, dt);
   return StringFormat("%04d-%02d-%02d %02d:%02d", dt.year, dt.mon, dt.day, dt.hour, dt.min);
}

void OnStart()
{
   string symbol = InpSymbol;
   StringTrimLeft(symbol);
   StringTrimRight(symbol);
   if(symbol == "")
      symbol = _Symbol;

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

   MqlRates rates[];
   ResetLastError();
   int copied = CopyRates(symbol, InpTimeframe, InpStartDate, InpEndDate, rates);
   if(copied <= 0)
   {
      PrintFormat("CopyRates failed: %s %s / error=%d", symbol, TimeframeToText(InpTimeframe), GetLastError());
      return;
   }

   ArraySetAsSeries(rates, false);

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   string timeframeText = TimeframeToText(InpTimeframe);
   string fileName = StringFormat(
      "AIFXLAB_%s_%s_%s_%s.csv",
      symbol,
      timeframeText,
      DateForFileName(InpStartDate),
      DateForFileName(InpEndDate)
   );

   int handle = FileOpen(fileName, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(handle == INVALID_HANDLE)
   {
      PrintFormat("FileOpen failed: %s / error=%d", fileName, GetLastError());
      return;
   }

   FileWrite(handle, "time", "open", "high", "low", "close", "volume");

   for(int i = 0; i < copied; i++)
   {
      FileWrite(
         handle,
         TimeForCsv(rates[i].time),
         DoubleToString(rates[i].open, digits),
         DoubleToString(rates[i].high, digits),
         DoubleToString(rates[i].low, digits),
         DoubleToString(rates[i].close, digits),
         (long)rates[i].tick_volume
      );
   }

   FileClose(handle);

   PrintFormat("AI FX LAB CSV exported: %s / %d bars", fileName, copied);
   Print("Open MT5: File > Open Data Folder > MQL5 > Files");
}
