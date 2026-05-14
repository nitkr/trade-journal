import { useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { tradeRepository } from '@/lib/repositories';
import { db } from '@/lib/db';
import type { Trade, TradeInput } from '@/types';
import { format } from 'date-fns';

interface CsvTradeRow {
  date: string;
  symbol: string;
  segment: string;
  direction: string;
  entryPrice: string;
  exitPrice: string;
  quantity: string;
  lotSize?: string;
  charges: string;
  tags?: string;
  emotion?: string;
  strategy?: string;
  notes?: string;
}

interface ZerodhaTradebookRow {
  symbol: string;
  isin: string;
  trade_date: string;
  exchange: string;
  segment: string;
  series: string;
  trade_type: string;
  auction: string;
  quantity: string;
  price: string;
  trade_id: string;
  order_id: string;
  order_execution_time: string;
  expiry_date: string;
}

// Map Zerodha month abbreviations to numbers
const MONTH_MAP: Record<string, string> = {
  'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
  'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
  'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
};

function parseSymbolDate(symbol: string, fallbackDate: string): string {
  const upperSymbol = symbol.toUpperCase();

  const patterns = [
    /(\d{2})([A-Z]{3})(\d{2})/i,
    /(\d{2})([A-Z]{3})(\d{1,2})/i,
  ];

  for (const pattern of patterns) {
    const match = upperSymbol.match(pattern);
    if (match) {
      const year = parseInt('20' + match[1]);
      const monthStr = match[2].toUpperCase();
      const month = MONTH_MAP[monthStr];

      if (month) {
        const day = match[3] ? parseInt(match[3]) : 1;
        const actualDay = Math.min(day || 1, 28);

        try {
          const dateStr = `${year}-${month}-${actualDay.toString().padStart(2, '0')}`;
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return format(date, 'yyyy-MM-dd');
          }
        } catch {
          // Fall through
        }
      }
    }
  }

  return fallbackDate;
}

function parseSymbol(symbol: string): { cleanSymbol: string; segment: 'Equity' | 'Futures' | 'Options' } {
  const upperSymbol = symbol.toUpperCase();

  let segment: 'Equity' | 'Futures' | 'Options' = 'Equity';
  let cleanSymbol = upperSymbol;

  // Detect Options by CE/PE suffix
  const isOptions = upperSymbol.includes('CE') || upperSymbol.includes('PE');

  if (isOptions) {
    segment = 'Options';
    // For options, keep the full symbol including strike price and expiry
    // Remove only the date pattern at the start (e.g., 23 from 23APR)
    // Pattern: optional 2-digit year at start followed by month abbrev and possibly more digits
    cleanSymbol = upperSymbol
      .replace(/^\d{2}(?=[A-Z]{3})/, '')  // Remove leading 23 from 23APR pattern
      .trim();
  } else if (upperSymbol.endsWith('F')) {
    segment = 'Futures';
    cleanSymbol = upperSymbol.slice(0, -1);  // Remove trailing F
  }

  return { cleanSymbol, segment };
}

export function useImportExport() {
  const exportToCsv = useCallback(async (trades: Trade[]) => {
    if (trades.length === 0) {
      toast.error('No trades to export');
      return;
    }

    // Fetch metadata for Zerodha P&L values
    const [totalRealizedPnl, totalCharges] = await Promise.all([
      db.getMetadata('totalRealizedPnl'),
      db.getMetadata('totalCharges'),
    ]);

    const data = trades.map((trade) => ({
      date: trade.date,
      symbol: trade.symbol,
      segment: trade.segment,
      direction: trade.direction,
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice.toString(),
      quantity: trade.quantity.toString(),
      lotSize: trade.lotSize?.toString() ?? '',
      charges: trade.charges.toString(),
      tags: trade.tags.join(', '),
      emotion: trade.emotion?.toString() ?? '',
      strategy: trade.strategy ?? '',
      notes: trade.notes ?? '',
    }));

    // Append metadata as special rows
    data.push(
      { date: '__METADATA__', symbol: 'totalRealizedPnl', segment: String(totalRealizedPnl ?? 0), direction: '', entryPrice: '', exitPrice: '', quantity: '', lotSize: '', charges: '', tags: '', emotion: '', strategy: '', notes: '' },
      { date: '__METADATA__', symbol: 'totalCharges', segment: String(totalCharges ?? 0), direction: '', entryPrice: '', exitPrice: '', quantity: '', lotSize: '', charges: '', tags: '', emotion: '', strategy: '', notes: '' }
    );

    const csv = Papa.unparse(data, { header: true });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trade-journal-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${trades.length} trades to CSV`);
  }, []);

  const exportToJson = useCallback(async (trades: Trade[]) => {
    if (trades.length === 0) {
      toast.error('No trades to export');
      return;
    }

    // Fetch metadata for Zerodha P&L values
    const [totalRealizedPnl, totalCharges] = await Promise.all([
      db.getMetadata('totalRealizedPnl'),
      db.getMetadata('totalCharges'),
    ]);

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      metadata: {
        totalRealizedPnl: totalRealizedPnl ?? 0,
        totalCharges: totalCharges ?? 0,
      },
      trades,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trade-journal-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${trades.length} trades to JSON`);
  }, []);

  const importFromCsv = useCallback(async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      Papa.parse<CsvTradeRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const trades: TradeInput[] = [];
          const errors: string[] = [];
          let totalRealizedPnl = 0;
          let totalCharges = 0;

          results.data.forEach((row, index) => {
            // Check for metadata row
            if (row.date === '__METADATA__') {
              const key = row.symbol;
              const value = parseFloat(row.segment) || 0;
              if (key === 'totalRealizedPnl') {
                totalRealizedPnl = value;
              } else if (key === 'totalCharges') {
                totalCharges = value;
              }
              return;
            }

            if (!row.date || !row.symbol || !row.segment || !row.direction) {
              errors.push(`Row ${index + 1}: Missing required fields`);
              return;
            }

            const segment = row.segment as TradeInput['segment'];
            if (!['Equity', 'Futures', 'Options', 'Currency'].includes(segment)) {
              errors.push(`Row ${index + 1}: Invalid segment "${row.segment}"`);
              return;
            }

            const direction = row.direction as TradeInput['direction'];
            if (!['Long', 'Short'].includes(direction)) {
              errors.push(`Row ${index + 1}: Invalid direction "${row.direction}"`);
              return;
            }

            const trade: TradeInput = {
              date: row.date,
              symbol: row.symbol.toUpperCase().trim(),
              segment,
              direction,
              entryPrice: parseFloat(row.entryPrice) || 0,
              exitPrice: parseFloat(row.exitPrice) || 0,
              quantity: parseInt(row.quantity) || 1,
              lotSize: row.lotSize ? parseInt(row.lotSize) : undefined,
              charges: parseFloat(row.charges) || 0,
              tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
              emotion: row.emotion ? parseInt(row.emotion) : undefined,
              strategy: row.strategy?.trim() || undefined,
              notes: row.notes?.trim() || undefined,
            };

            trades.push(trade);
          });

          if (errors.length > 0) {
            toast.error(`Import completed with ${errors.length} errors`, {
              description: errors.slice(0, 3).join('\n'),
            });
          }

          if (trades.length > 0) {
            await tradeRepository.bulkCreate(trades);

            // Restore metadata if present
            if (totalRealizedPnl > 0 || totalCharges > 0) {
              try {
                if (totalRealizedPnl > 0) {
                  await db.setMetadata('totalRealizedPnl', totalRealizedPnl);
                }
                if (totalCharges > 0) {
                  await db.setMetadata('totalCharges', totalCharges);
                }
              } catch (metadataError) {
                console.warn('Failed to restore metadata:', metadataError);
              }
            }

            toast.success(`Imported ${trades.length} trades`);
            resolve(trades.length);
          } else {
            reject(new Error('No valid trades found in file'));
          }
        },
        error: (error: Error) => {
          toast.error('Failed to parse CSV file');
          reject(error);
        },
      });
    });
  }, []);

  const importFromJson = useCallback(async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);

          // Support both old format (array) and new format (object with metadata)
          let trades: TradeInput[];
          let metadata: { totalRealizedPnl?: number; totalCharges?: number } | null = null;

          if (Array.isArray(parsed)) {
            // Old format: just an array of trades
            trades = parsed as TradeInput[];
          } else if (parsed.version && parsed.trades) {
            // New format with metadata
            trades = parsed.trades as TradeInput[];
            metadata = parsed.metadata || null;
          } else {
            throw new Error('Invalid JSON format');
          }

          const validTrades = trades.filter(
            (t: TradeInput) => t.date && t.symbol && t.segment && t.direction
          );

          if (validTrades.length === 0) {
            throw new Error('No valid trades found in file');
          }

          await tradeRepository.bulkCreate(validTrades);

          // Restore metadata if present
          if (metadata) {
            try {
              if (metadata.totalRealizedPnl !== undefined) {
                await db.setMetadata('totalRealizedPnl', metadata.totalRealizedPnl);
              }
              if (metadata.totalCharges !== undefined) {
                await db.setMetadata('totalCharges', metadata.totalCharges);
              }
            } catch (metadataError) {
              console.warn('Failed to restore metadata:', metadataError);
            }
          }

          toast.success(`Imported ${validTrades.length} trades`);
          resolve(validTrades.length);
        } catch (error) {
          toast.error('Failed to import JSON file');
          reject(error);
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read file');
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }, []);

  const importFromZerodha = useCallback(async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result;
          const workbook = XLSX.read(content, { type: 'binary' });

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 }) as any[][];

          if (rawData.length === 0) {
            throw new Error('No data found in file');
          }

          let dateRangeStart = format(new Date(), 'yyyy-MM-dd');
          let totalCharges = 0;

          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row)) continue;

            const rowText = row.join(' ');

            const dateMatch = rowText.match(/P&L Statement for F&O from (\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              dateRangeStart = dateMatch[1];
            }

            const chargesMatch = rowText.match(/Charges\s*[,]*\s*([\d.]+)/);
            if (chargesMatch) {
              totalCharges = parseFloat(chargesMatch[1]) || 0;
            }
          }

          let headerRowIndex = -1;
          let headerRow: string[] = [];

          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && Array.isArray(row) && row.includes('Symbol')) {
              headerRowIndex = i;
              headerRow = row.map(String);
              break;
            }
          }

          if (headerRowIndex === -1) {
            throw new Error('Could not find header row with "Symbol" column');
          }

          const trades: TradeInput[] = [];
          const errors: string[] = [];

          for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row) || row.length < 6) continue;

            const rowData: Record<string, string> = {};
            headerRow.forEach((col, idx) => {
              if (col && col.trim()) {
                rowData[col.trim()] = row[idx]?.toString() || '';
              }
            });

            const symbol = rowData['Symbol'] || '';
            const quantityStr = rowData['Quantity'] || '0';
            const buyValueStr = rowData['Buy Value'] || '0';
            const sellValueStr = rowData['Sell Value'] || '0';
            const realizedPnlStr = rowData['Realized P&L'] || '0';

            if (!symbol || symbol.trim() === '') continue;

            const quantity = parseInt(quantityStr) || 0;
            const buyValue = parseFloat(buyValueStr) || 0;
            const sellValue = parseFloat(sellValueStr) || 0;
            const realizedPnl = parseFloat(realizedPnlStr) || 0;

            if (quantity === 0) {
              errors.push(`Skipping ${symbol}: Invalid quantity`);
              continue;
            }

            const avgBuyPrice = quantity > 0 ? buyValue / quantity : 0;
            const avgSellPrice = quantity > 0 ? sellValue / quantity : 0;
            const direction: TradeInput['direction'] = 'Long';

            const { cleanSymbol, segment } = parseSymbol(symbol);
            const tradeDate = parseSymbolDate(symbol, dateRangeStart);

            const chargesPortion = quantity > 0 ? (totalCharges / rawData.length) : 0;

            if (!cleanSymbol) {
              errors.push(`Skipping ${symbol}: Invalid symbol after parsing`);
              continue;
            }

            const trade: TradeInput = {
              date: tradeDate,
              symbol: cleanSymbol,
              segment,
              direction,
              entryPrice: parseFloat(avgBuyPrice.toFixed(2)),
              exitPrice: parseFloat(avgSellPrice.toFixed(2)),
              quantity,
              charges: Math.abs(chargesPortion),
              tags: ['Zerodha'],
              notes: `Realized P&L: ₹${realizedPnl.toFixed(2)} | Buy: ₹${buyValue.toFixed(2)} | Sell: ₹${sellValue.toFixed(2)}`,
            };

            trades.push(trade);
          }

          if (errors.length > 0) {
            toast.warning(`Imported ${trades.length} trades, ${errors.length} skipped`, {
              description: errors.slice(0, 3).join('\n'),
            });
          }

          if (trades.length > 0) {
            await tradeRepository.bulkCreate(trades);
            toast.success(`Imported ${trades.length} trades from Zerodha P&L`);
            resolve(trades.length);
          } else {
            throw new Error('No valid trades found in file');
          }
        } catch (error) {
          console.error('Import error:', error);
          toast.error('Failed to import Zerodha file');
          reject(error);
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read file');
        reject(new Error('Failed to read file'));
      };

      reader.readAsBinaryString(file);
    });
  }, []);

  const importFromZerodhaTradebook = useCallback(async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      Papa.parse<ZerodhaTradebookRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (results.errors.length > 0) {
            toast.error('Failed to parse tradebook file');
            reject(new Error('Parse error'));
            return;
          }

          const errors: string[] = [];

          // First, deduplicate by trade_id - each trade should only appear once
          const seenTradeIds = new Set<string>();
          const uniqueRows: ZerodhaTradebookRow[] = [];

          results.data.forEach((row) => {
            if (row.trade_id && seenTradeIds.has(row.trade_id)) {
              return; // Skip duplicate
            }
            if (row.trade_id) {
              seenTradeIds.add(row.trade_id);
            }
            uniqueRows.push(row);
          });

          // Group trades by symbol+expiry for FIFO matching
          // Key: symbol_expiryDate
          const tradesBySymbolExpiry = new Map<string, {
            symbol: string;
            expiryDate: string;
            // Group by trade_date to aggregate same-day trades
            dailyData: Map<string, {
              totalBuyQty: number;
              totalSellQty: number;
              buyValue: number;  // for weighted avg
              sellValue: number;
              buyTradeIds: string[];
              sellTradeIds: string[];
            }>;
          }>();

          uniqueRows.forEach((row, index) => {
            if (!row.symbol || !row.trade_date || !row.trade_type || !row.quantity || !row.price) {
              errors.push(`Row ${index + 1}: Missing required fields`);
              return;
            }

            const symbol = row.symbol.toUpperCase().trim();
            const expiryDate = row.expiry_date || '';
            const tradeDate = row.trade_date;
            const quantity = parseFloat(row.quantity);
            const price = parseFloat(row.price);
            const tradeType = row.trade_type.toLowerCase();
            const tradeId = row.trade_id || `row_${index}`;

            if (quantity <= 0 || isNaN(quantity)) {
              errors.push(`Row ${index + 1}: Invalid quantity`);
              return;
            }
            if (price <= 0 || isNaN(price)) {
              errors.push(`Row ${index + 1}: Invalid price`);
              return;
            }

            const key = `${symbol}_${expiryDate}`;
            let existing = tradesBySymbolExpiry.get(key);

            if (!existing) {
              existing = {
                symbol,
                expiryDate,
                dailyData: new Map(),
              };
              tradesBySymbolExpiry.set(key, existing);
            }

            let dayData = existing.dailyData.get(tradeDate);
            if (!dayData) {
              dayData = {
                totalBuyQty: 0,
                totalSellQty: 0,
                buyValue: 0,
                sellValue: 0,
                buyTradeIds: [],
                sellTradeIds: [],
              };
              existing.dailyData.set(tradeDate, dayData);
            }

            if (tradeType === 'buy') {
              dayData.totalBuyQty += quantity;
              dayData.buyValue += quantity * price;
              dayData.buyTradeIds.push(tradeId);
            } else if (tradeType === 'sell') {
              dayData.totalSellQty += quantity;
              dayData.sellValue += quantity * price;
              dayData.sellTradeIds.push(tradeId);
            }
          });

          // Now match trades by FIFO across days
          const trades: TradeInput[] = [];

          tradesBySymbolExpiry.forEach((data) => {
            const { cleanSymbol, segment } = parseSymbol(data.symbol);

            if (!cleanSymbol) {
              errors.push(`Skipping ${data.symbol}: Could not parse symbol`);
              return;
            }

            // Collect all days with data, sorted by date
            const days = Array.from(data.dailyData.entries())
              .sort((a, b) => a[0].localeCompare(b[0]));

            // Track remaining buy/sell quantities for FIFO matching across days
            let remainingBuys: { qty: number; price: number; date: string; tradeIds: string[] }[] = [];
            let remainingSells: { qty: number; price: number; date: string; tradeIds: string[] }[] = [];

            days.forEach(([date, dayData]) => {
              // Add day's buys to remaining
              if (dayData.totalBuyQty > 0) {
                const avgBuyPrice = dayData.buyValue / dayData.totalBuyQty;
                remainingBuys.push({
                  qty: dayData.totalBuyQty,
                  price: avgBuyPrice,
                  date,
                  tradeIds: dayData.buyTradeIds,
                });
              }

              // Add day's sells to remaining
              if (dayData.totalSellQty > 0) {
                const avgSellPrice = dayData.sellValue / dayData.totalSellQty;
                remainingSells.push({
                  qty: dayData.totalSellQty,
                  price: avgSellPrice,
                  date,
                  tradeIds: dayData.sellTradeIds,
                });
              }

              // Match buys with sells using FIFO (oldest first)
              while (remainingBuys.length > 0 && remainingSells.length > 0) {
                const buy = remainingBuys[0];
                const sell = remainingSells[0];

                // Both buys and sells may have been accumulated from multiple rows
                // We need weighted average prices when matching across multiple aggregated buys/sells

                const matchQty = Math.min(buy.qty, sell.qty);

                // Calculate weighted average entry/exit for this match
                const avgEntryPrice = buy.price;
                const avgExitPrice = sell.price;

                // Determine direction based on which came first
                const buyDate = new Date(buy.date);
                const sellDate = new Date(sell.date);
                const direction: TradeInput['direction'] = buyDate <= sellDate ? 'Long' : 'Short';

                // Use earlier date as trade date
                const tradeDate = buy.date < sell.date ? buy.date : sell.date;

                // All trade IDs for this match
                const allTradeIds = [...buy.tradeIds, ...sell.tradeIds].join('/');

                const trade: TradeInput = {
                  date: tradeDate,
                  symbol: cleanSymbol,
                  segment,
                  direction,
                  entryPrice: parseFloat(avgEntryPrice.toFixed(2)),
                  exitPrice: parseFloat(avgExitPrice.toFixed(2)),
                  quantity: matchQty,
                  charges: 0,
                  tags: ['Zerodha', segment],
                  notes: segment === 'Options'
                    ? `Expiry: ${data.expiryDate} | Trade IDs: ${allTradeIds}`
                    : `Trade IDs: ${allTradeIds}`,
                };

                trades.push(trade);

                // Update remaining quantities
                buy.qty -= matchQty;
                sell.qty -= matchQty;

                if (buy.qty <= 0) remainingBuys.shift();
                if (sell.qty <= 0) remainingSells.shift();
              }
            });

            // Log any remaining (open) positions
            const totalUnmatched = remainingBuys.reduce((sum, b) => sum + b.qty, 0) +
                                   remainingSells.reduce((sum, s) => sum + s.qty, 0);
            if (totalUnmatched > 0) {
              errors.push(`${data.symbol}: ${totalUnmatched} units still open (unmatched)`);
            }
          });

          if (errors.length > 0) {
            toast.warning(`Processed with ${errors.length} warnings`, {
              description: errors.slice(0, 5).join('\n'),
            });
          }

          if (trades.length > 0) {
            await tradeRepository.bulkCreate(trades);
            toast.success(`Imported ${trades.length} trades from Zerodha Tradebook`);
            resolve(trades.length);
          } else {
            toast.error('No valid trades found in tradebook');
            reject(new Error('No valid trades found'));
          }
        },
        error: (error: Error) => {
          toast.error('Failed to parse tradebook file');
          reject(error);
        },
      });
    });
  }, []);

  // Helper function to parse P&L xlsx and extract realized P&L by symbol and summary
  const parseZerodhaPLForRealizedPnl = async (file: File): Promise<{
    pnlBySymbol: Map<string, {
      quantity: number;
      buyValue: number;
      sellValue: number;
      realizedPnl: number;
      openQuantity: number;
    }>;
    totalRealizedPnl: number;
    totalCharges: number;
    hasOpenPositions: boolean;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result;
          const workbook = XLSX.read(content, { type: 'binary' });

          const pnlBySymbol = new Map<string, {
            quantity: number;
            buyValue: number;
            sellValue: number;
            realizedPnl: number;
            openQuantity: number;
          }>();

          let totalRealizedPnl = 0;
          let totalCharges = 0;
          let hasOpenPositions = false;

          // Parse each sheet to find Options and Futures sections
          for (const sheetName of workbook.SheetNames) {
            
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 }) as any[][];

            // First, extract summary data (charges, realized P&L) - scan entire sheet
            for (let i = 0; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || !Array.isArray(row)) continue;

              const rowText = row.join(' ');
              

              // Match patterns like "Realized P&L,21811.5" or "Realized P&L 21811.5"
              const pnlMatch = rowText.match(/Realized\s*P&L\s*[,]*\s*([\d.]+)/i);
              if (pnlMatch && pnlMatch[1]) {
                const parsedPnl = parseFloat(pnlMatch[1]);
                
                if (!isNaN(parsedPnl) && parsedPnl > totalRealizedPnl) {
                  totalRealizedPnl = parsedPnl;
                }
              }

              // Match patterns like "Charges,6287.8315" or "Charges 6287.8315"
              const chargesMatch = rowText.match(/Charges\s*[,]*\s*([\d.]+)/i);
              if (chargesMatch && chargesMatch[1]) {
                const parsedCharges = parseFloat(chargesMatch[1]);
                
                if (!isNaN(parsedCharges) && parsedCharges > totalCharges) {
                  totalCharges = parsedCharges;
                }
              }
            }

            

            let headerRowIndex = -1;
            let headerRow: string[] = [];

            // Find "Symbol" header row
            for (let i = 0; i < rawData.length; i++) {
              const row = rawData[i];
              if (row && Array.isArray(row) && row.includes('Symbol')) {
                headerRowIndex = i;
                headerRow = row.map(String);
                break;
              }
            }

            if (headerRowIndex === -1) continue;

            // Parse data rows
            for (let i = headerRowIndex + 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || !Array.isArray(row) || row.length < 6) continue;

              const rowData: Record<string, string> = {};
              headerRow.forEach((col, idx) => {
                if (col && col.trim()) {
                  rowData[col.trim()] = row[idx]?.toString() || '';
                }
              });

              const symbol = rowData['Symbol'] || '';
              const quantityStr = rowData['Quantity'] || '0';
              const buyValueStr = rowData['Buy Value'] || '0';
              const sellValueStr = rowData['Sell Value'] || '0';
              const realizedPnlStr = rowData['Realized P&L'] || '0';
              const openQuantityStr = rowData['Open Quantity'] || '0';

              if (!symbol || symbol.trim() === '') continue;

              const quantity = parseInt(quantityStr) || 0;
              const buyValue = parseFloat(buyValueStr) || 0;
              const sellValue = parseFloat(sellValueStr) || 0;
              const realizedPnl = parseFloat(realizedPnlStr) || 0;
              const openQuantity = parseInt(openQuantityStr) || 0;

              if (openQuantity > 0) hasOpenPositions = true;

              if (quantity === 0) continue;

              // Normalize symbol key (same as parseSymbol would do)
              const { cleanSymbol } = parseSymbol(symbol);
              if (!cleanSymbol) continue;

              // Store by clean symbol (there may be multiple rows for same symbol across sheets)
              const existing = pnlBySymbol.get(cleanSymbol);
              if (existing) {
                existing.quantity += quantity;
                existing.buyValue += buyValue;
                existing.sellValue += sellValue;
                existing.realizedPnl += realizedPnl;
                existing.openQuantity += openQuantity;
              } else {
                pnlBySymbol.set(cleanSymbol, { quantity, buyValue, sellValue, realizedPnl, openQuantity });
              }
            }
          }

          resolve({ pnlBySymbol, totalRealizedPnl, totalCharges, hasOpenPositions });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsBinaryString(file);
    });
  };

  const importFromZerodhaCombined = useCallback(async (plFile: File, tradebookFile: File): Promise<{ trades: number; pnlData: number }> => {
    try {
      // Step 1: Parse P&L to get realized P&L by symbol
      toast.info('Parsing P&L file for realized P&L values...');
      const { pnlBySymbol, totalRealizedPnl, totalCharges, hasOpenPositions } = await parseZerodhaPLForRealizedPnl(plFile);

      // Step 2: Parse tradebook to get actual trade dates and match buy/sell
      toast.info('Parsing tradebook for actual trade dates...');

      const tradesBySymbolExpiry = new Map<string, {
        symbol: string;
        expiryDate: string;
        dailyData: Map<string, {
          totalBuyQty: number;
          totalSellQty: number;
          buyValue: number;
          sellValue: number;
          buyTradeIds: string[];
          sellTradeIds: string[];
        }>;
      }>();

      const parseResult = await new Promise<{ tradesBySymbolExpiry: typeof tradesBySymbolExpiry; errors: string[] }>((resolve, reject) => {
        Papa.parse<ZerodhaTradebookRow>(tradebookFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const errors: string[] = [];

            // Deduplicate by trade_id
            const seenTradeIds = new Set<string>();
            const uniqueRows: ZerodhaTradebookRow[] = [];

            results.data.forEach((row) => {
              if (row.trade_id && seenTradeIds.has(row.trade_id)) return;
              if (row.trade_id) seenTradeIds.add(row.trade_id);
              uniqueRows.push(row);
            });

            uniqueRows.forEach((row, index) => {
              if (!row.symbol || !row.trade_date || !row.trade_type || !row.quantity || !row.price) {
                errors.push(`Row ${index + 1}: Missing required fields`);
                return;
              }

              const symbol = row.symbol.toUpperCase().trim();
              const expiryDate = row.expiry_date || '';
              const tradeDate = row.trade_date;
              const quantity = parseFloat(row.quantity);
              const price = parseFloat(row.price);
              const tradeType = row.trade_type.toLowerCase();
              const tradeId = row.trade_id || `row_${index}`;

              if (quantity <= 0 || isNaN(quantity) || price <= 0 || isNaN(price)) return;

              const key = `${symbol}_${expiryDate}`;
              let existing = tradesBySymbolExpiry.get(key);

              if (!existing) {
                existing = {
                  symbol,
                  expiryDate,
                  dailyData: new Map(),
                };
                tradesBySymbolExpiry.set(key, existing);
              }

              let dayData = existing.dailyData.get(tradeDate);
              if (!dayData) {
                dayData = {
                  totalBuyQty: 0,
                  totalSellQty: 0,
                  buyValue: 0,
                  sellValue: 0,
                  buyTradeIds: [],
                  sellTradeIds: [],
                };
                existing.dailyData.set(tradeDate, dayData);
              }

              if (tradeType === 'buy') {
                dayData.totalBuyQty += quantity;
                dayData.buyValue += quantity * price;
                dayData.buyTradeIds.push(tradeId);
              } else if (tradeType === 'sell') {
                dayData.totalSellQty += quantity;
                dayData.sellValue += quantity * price;
                dayData.sellTradeIds.push(tradeId);
              }
            });

            resolve({ tradesBySymbolExpiry, errors });
          },
          error: (error: Error) => {
            reject(error);
          },
        });
      });

      // Step 3: Create trades using FIFO matching and P&L values
      const trades: TradeInput[] = [];
      const errors: string[] = parseResult.errors;

      tradesBySymbolExpiry.forEach((data) => {
        const { cleanSymbol, segment } = parseSymbol(data.symbol);

        if (!cleanSymbol) {
          errors.push(`Skipping ${data.symbol}: Could not parse symbol`);
          return;
        }

        // Get P&L data for this symbol (look for any key that matches the base symbol)
        const symbolPnl = pnlBySymbol.get(cleanSymbol) ||
          Array.from(pnlBySymbol.entries()).find(([key]) => key.startsWith(cleanSymbol.split('F')[0].split('CE')[0].split('PE')[0]))?.[1];

        const days = Array.from(data.dailyData.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));

        let remainingBuys: { qty: number; price: number; date: string; tradeIds: string[] }[] = [];
        let remainingSells: { qty: number; price: number; date: string; tradeIds: string[] }[] = [];

        days.forEach(([date, dayData]) => {
          if (dayData.totalBuyQty > 0) {
            remainingBuys.push({
              qty: dayData.totalBuyQty,
              price: dayData.buyValue / dayData.totalBuyQty,
              date,
              tradeIds: dayData.buyTradeIds,
            });
          }

          if (dayData.totalSellQty > 0) {
            remainingSells.push({
              qty: dayData.totalSellQty,
              price: dayData.sellValue / dayData.totalSellQty,
              date,
              tradeIds: dayData.sellTradeIds,
            });
          }

          while (remainingBuys.length > 0 && remainingSells.length > 0) {
            const buy = remainingBuys[0];
            const sell = remainingSells[0];

            const matchQty = Math.min(buy.qty, sell.qty);
            const avgEntryPrice = buy.price;
            const avgExitPrice = sell.price;

            // Direction is determined by price comparison:
            // - Long: bought cheap, sold expensive (exitPrice > entryPrice)
            // - Short: sold expensive, bought back cheap (exitPrice < entryPrice)
            const direction: TradeInput['direction'] = avgExitPrice >= avgEntryPrice ? 'Long' : 'Short';

            const tradeDate = buy.date < sell.date ? buy.date : sell.date;
            const allTradeIds = [...buy.tradeIds, ...sell.tradeIds].join('/');

            // Calculate P&L proportion for this match
            let tradeRealizedPnl = 0;
            let tradeNotes = '';

            if (symbolPnl && matchQty > 0) {
              // Proportionally calculate P&L for this quantity
              const proportion = matchQty / symbolPnl.quantity;
              tradeRealizedPnl = symbolPnl.realizedPnl * proportion;
              // Round to 4 decimal places to preserve precision from P&L
              const roundedBuyValue = Math.round(symbolPnl.buyValue * proportion * 10000) / 10000;
              const roundedSellValue = Math.round(symbolPnl.sellValue * proportion * 10000) / 10000;
              const roundedPnl = Math.round(tradeRealizedPnl * 10000) / 10000;
              tradeNotes = `Realized P&L: ₹${roundedPnl} | Buy: ₹${roundedBuyValue} | Sell: ₹${roundedSellValue}`;
            } else {
              tradeNotes = `Trade IDs: ${allTradeIds}`;
            }

            const trade: TradeInput = {
              date: tradeDate,
              symbol: cleanSymbol,
              segment,
              direction,
              entryPrice: parseFloat(avgEntryPrice.toFixed(2)),
              exitPrice: parseFloat(avgExitPrice.toFixed(2)),
              quantity: matchQty,
              charges: 0,
              tags: ['Zerodha', segment],
              notes: segment === 'Options'
                ? `Expiry: ${data.expiryDate} | ${tradeNotes}`
                : tradeNotes,
            };

            trades.push(trade);

            buy.qty -= matchQty;
            sell.qty -= matchQty;

            if (buy.qty <= 0) remainingBuys.shift();
            if (sell.qty <= 0) remainingSells.shift();
          }
        });

        const totalUnmatched = remainingBuys.reduce((sum, b) => sum + b.qty, 0) +
                               remainingSells.reduce((sum, s) => sum + s.qty, 0);
        if (totalUnmatched > 0) {
          errors.push(`${data.symbol}: ${totalUnmatched} units still open`);
        }
      });

      if (errors.length > 0) {
        toast.warning(`Processed with ${errors.length} warnings`, {
          description: errors.slice(0, 5).join('\n'),
        });
      }

      if (trades.length > 0) {
        // Save trades first - this is the critical operation
        await tradeRepository.bulkCreate(trades);

        const tradesCount = trades.length;
        const pnlDataCount = pnlBySymbol.size;

        // Try to store metadata (non-critical, won't fail the import if it errors)
        try {
          const existingPnl = await db.getMetadata('totalRealizedPnl');

          if (existingPnl === null || existingPnl === 0) {
            // Only set if not already set or zero
            await db.setMetadata('totalRealizedPnl', totalRealizedPnl);
            await db.setMetadata('totalCharges', totalCharges);
            await db.setMetadata('hasOpenPositions', hasOpenPositions ? 1 : 0);
          }
        } catch (metadataError) {
          console.warn('Failed to store P&L metadata (non-critical):', metadataError);
        }

        toast.success(`Imported ${tradesCount} trades with P&L values`);
        return { trades: tradesCount, pnlData: pnlDataCount };
      } else {
        throw new Error('No valid trades found');
      }
    } catch (error) {
      console.error('Combined import error:', error);
      toast.error('Failed to import combined data');
      throw error;
    }
  }, []);

  return {
    exportToCsv,
    exportToJson,
    importFromCsv,
    importFromJson,
    importFromZerodha,
    importFromZerodhaTradebook,
    importFromZerodhaCombined,
  };
}