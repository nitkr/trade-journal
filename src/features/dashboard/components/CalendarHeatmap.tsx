import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrades } from '@/hooks/useTrades';
import { formatCurrency } from '@/lib/calculations';
import type { Trade } from '@/types';

interface CalendarHeatmapProps {
  year?: number;
  month?: number;
}

export function CalendarHeatmap({ year = new Date().getFullYear(), month = new Date().getMonth() }: CalendarHeatmapProps) {
  const { trades } = useTrades();

  const dailyPnlMap = useMemo(() => {
    const map = new Map<string, number>();
    trades.forEach((t: Trade) => {
      const existing = map.get(t.date) || 0;
      map.set(t.date, existing + t.pnl);
    });
    return map;
  }, [trades]);

  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(monthStart);

  // Get calendar days (including padding days from prev/next month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Calculate P&L range for color scaling
  const pnlValues = Array.from(dailyPnlMap.values());
  const maxPnl = Math.max(0, ...pnlValues);
  const minPnl = Math.min(0, ...pnlValues);
  const range = maxPnl - minPnl || 1;

  const getColor = (pnl: number): string => {
    if (pnl === 0) return 'bg-muted';
    const intensity = Math.abs(pnl) / range;
    const alpha = 0.2 + intensity * 0.6; // 0.2 to 0.8

    if (pnl > 0) {
      return `rgba(34, 197, 94, ${alpha})`; // green
    } else {
      return `rgba(239, 68, 68, ${alpha})`; // red
    }
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Group days by week
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {format(monthStart, 'MMMM yyyy')}
        </CardTitle>
        <CardDescription>Daily P&L heatmap</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-xs text-muted-foreground text-center py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {weeks.map((week) =>
            week.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const pnl = dailyPnlMap.get(dateStr) || 0;
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={dateStr}
                  className={`
                    aspect-square rounded-md flex flex-col items-center justify-center text-xs
                    ${isCurrentMonth ? '' : 'opacity-30'}
                    ${isToday ? 'ring-2 ring-primary' : ''}
                  `}
                  style={{ backgroundColor: pnl !== 0 ? getColor(pnl) : undefined }}
                  title={isCurrentMonth ? `${format(day, 'dd MMM')}: ${formatCurrency(pnl)}` : ''}
                >
                  <span className={isCurrentMonth ? '' : 'text-muted-foreground'}>
                    {format(day, 'd')}
                  </span>
                  {pnl !== 0 && isCurrentMonth && (
                    <span className={`text-[10px] ${pnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pnl > 0 ? '+' : ''}{Math.round(pnl / 1000)}k
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-500/50" />
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted" />
            <span>No trades</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-500/50" />
            <span>Profit</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}