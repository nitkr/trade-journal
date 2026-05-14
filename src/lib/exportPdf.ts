import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/calculations';
import type { Trade, DetailedStats } from '@/types';

interface ExportOptions {
  title?: string;
  includeTrades?: boolean;
  includeStats?: boolean;
}

export async function exportToPdf(
  trades: Trade[],
  stats: DetailedStats,
  options: ExportOptions = {}
): Promise<void> {
  const {
    title = 'Trading Report',
    includeTrades = true,
    includeStats = true,
  } = options;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  // Date range
  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateRange = trades.length > 0
    ? `${format(new Date(trades[trades.length - 1].date), 'dd MMM yyyy')} - ${format(new Date(trades[0].date), 'dd MMM yyyy')}`
    : 'No trades';
  doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')} | ${dateRange}`, pageWidth / 2, 28, { align: 'center' });

  // Summary Stats
  if (includeStats && trades.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Summary Statistics', 14, 45);

    const statsData = [
      ['Total Trades', stats.totalTrades.toString()],
      ['Trading Days', stats.tradingDays.toString()],
      ['Win Rate', `${stats.winRate.toFixed(2)}%`],
      ['Profit Factor', stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)],
      ['Net P&L', formatCurrency(stats.netPnl)],
      ['Avg Win', formatCurrency(stats.averageWin)],
      ['Avg Loss', formatCurrency(stats.averageLoss)],
      ['Expectancy', formatCurrency(stats.expectancy)],
      ['Max Drawdown', formatCurrency(stats.maxDrawdown)],
      ['Best Streak', `${stats.maxConsecutiveWins} days`],
      ['Worst Streak', `${stats.maxConsecutiveLosses} days`],
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40] },
      margin: { left: 14, right: 14 },
    });
  }

  // Trades Table
  if (includeTrades && trades.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 50;

    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Trade Log', 14, finalY + 15);

    const tradeRows = trades.map((t) => [
      format(new Date(t.date), 'dd MMM'),
      t.symbol,
      t.segment,
      t.direction,
      t.entryPrice.toFixed(2),
      t.exitPrice.toFixed(2),
      t.quantity.toString(),
      t.pnl >= 0 ? `+${formatCurrency(t.pnl)}` : formatCurrency(t.pnl),
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'Symbol', 'Segment', 'Direction', 'Entry', 'Exit', 'Qty', 'P&L']],
      body: tradeRows,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | Trade Journal`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Download
  doc.save(`trading-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportSummaryToPdf(
  stats: DetailedStats,
  dateRange: string
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text('Trading Performance Summary', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${dateRange} | Generated: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth / 2, 28, { align: 'center' });

  const statsData = [
    ['Total Trades', stats.totalTrades.toString()],
    ['Winning Trades', stats.winningTrades.toString()],
    ['Losing Trades', stats.losingTrades.toString()],
    ['Win Rate', `${stats.winRate.toFixed(2)}%`],
    ['Net P&L', formatCurrency(stats.netPnl)],
    ['Profit Factor', stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)],
    ['Average Win', formatCurrency(stats.averageWin)],
    ['Average Loss', formatCurrency(stats.averageLoss)],
    ['Expectancy', formatCurrency(stats.expectancy)],
    ['Max Drawdown', formatCurrency(stats.maxDrawdown)],
    ['Best Day', formatCurrency(stats.maxProfit)],
    ['Worst Day', formatCurrency(stats.maxLoss)],
  ];

  autoTable(doc, {
    startY: 40,
    head: [['Metric', 'Value']],
    body: statsData,
    theme: 'striped',
    headStyles: { fillColor: [40, 40, 40] },
  });

  doc.save(`performance-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}