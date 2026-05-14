import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TradeForm } from './TradeForm';
import { PositionSizeCalculator } from './PositionSizeCalculator';
import { useTrades, useTradeMutations } from '@/hooks/useTrades';
import { formatCurrency } from '@/lib/calculations';
import type { Trade, TradeInput } from '@/types';
import { toast } from 'sonner';

interface TradeLogProps {
  triggerAddTrade?: boolean;
  onAddTradeOpened?: () => void;
}

export function TradeLog({ triggerAddTrade, onAddTradeOpened }: TradeLogProps) {
  const { trades, isLoading } = useTrades();
  const { createTrade, updateTrade, deleteTrade } = useTradeMutations();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null);

  // Open add dialog when triggered externally (e.g., via keyboard shortcut)
  useEffect(() => {
    if (triggerAddTrade) {
      setIsAddDialogOpen(true);
      onAddTradeOpened?.();
    }
  }, [triggerAddTrade, onAddTradeOpened]);

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(trades.map((t) => t.symbol));
    return Array.from(symbols).sort();
  }, [trades]);

  const uniqueSegments = useMemo(() => {
    const segments = new Set(trades.map((t) => t.segment));
    return Array.from(segments).sort();
  }, [trades]);

  const columns = useMemo<ColumnDef<Trade>[]>(
    () => [
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => format(new Date(row.original.date), 'dd MMM yyyy'),
      },
      {
        accessorKey: 'symbol',
        header: 'Symbol',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.symbol}</span>
        ),
      },
      {
        accessorKey: 'segment',
        header: 'Segment',
        cell: ({ row }) => <Badge variant="outline">{row.original.segment}</Badge>,
      },
      {
        accessorKey: 'direction',
        header: 'Direction',
        cell: ({ row }) => (
          <Badge variant={row.original.direction === 'Long' ? 'success' : 'destructive'}>
            {row.original.direction}
          </Badge>
        ),
      },
      {
        accessorKey: 'entryPrice',
        header: 'Entry',
        cell: ({ row }) => row.original.entryPrice.toFixed(2),
      },
      {
        accessorKey: 'exitPrice',
        header: 'Exit',
        cell: ({ row }) => row.original.exitPrice.toFixed(2),
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
      },
      {
        accessorKey: 'pnl',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-right"
          >
            P&L
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const pnl = row.original.pnl;
          return (
            <span className={pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
              {pnl >= 0 ? '+' : ''}
              {formatCurrency(pnl)}
            </span>
          );
        },
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {row.original.tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{row.original.tags.length - 2}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingTrade(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeletingTrade(row.original)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const filteredTrades = useMemo(() => {
    let result = trades;
    if (symbolFilter && symbolFilter !== '__all__') {
      result = result.filter((t) => t.symbol === symbolFilter);
    }
    if (segmentFilter && segmentFilter !== '__all__') {
      result = result.filter((t) => t.segment === segmentFilter);
    }
    return result;
  }, [trades, symbolFilter, segmentFilter]);

  const table = useReactTable({
    data: filteredTrades,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleAddTrade = async (data: TradeInput) => {
    try {
      await createTrade(data);
      toast.success('Trade added successfully');
      setIsAddDialogOpen(false);
    } catch {
      toast.error('Failed to add trade');
    }
  };

  const handleUpdateTrade = async (data: TradeInput) => {
    if (!editingTrade?.id) return;
    try {
      await updateTrade(editingTrade.id, data);
      toast.success('Trade updated successfully');
      setEditingTrade(null);
    } catch {
      toast.error('Failed to update trade');
    }
  };

  const handleDeleteTrade = async () => {
    if (!deletingTrade?.id) return;
    try {
      await deleteTrade(deletingTrade.id);
      toast.success('Trade deleted successfully');
      setDeletingTrade(null);
    } catch {
      toast.error('Failed to delete trade');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading trades...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Trade Log</h2>
          <p className="text-muted-foreground">
            {trades.length} {trades.length === 1 ? 'trade' : 'trades'} recorded
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Trade
          </Button>
          <PositionSizeCalculator />
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search trades..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select value={symbolFilter} onValueChange={setSymbolFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Symbols" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Symbols</SelectItem>
            {uniqueSymbols.map((symbol) => (
              <SelectItem key={symbol} value={symbol}>
                {symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Segments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Segments</SelectItem>
            {uniqueSegments.map((segment) => (
              <SelectItem key={segment} value={segment}>
                {segment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No trades found. Add your first trade!
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Add Trade Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Trade</DialogTitle>
          </DialogHeader>
          <TradeForm
            onSubmit={handleAddTrade}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Trade Dialog */}
      <Dialog open={!!editingTrade} onOpenChange={() => setEditingTrade(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trade</DialogTitle>
          </DialogHeader>
          <TradeForm
            trade={editingTrade ?? undefined}
            onSubmit={handleUpdateTrade}
            onCancel={() => setEditingTrade(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTrade} onOpenChange={() => setDeletingTrade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trade</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this trade for{' '}
            <strong>{deletingTrade?.symbol}</strong> on{' '}
            {deletingTrade && format(new Date(deletingTrade.date), 'dd MMM yyyy')}?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTrade(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTrade}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}