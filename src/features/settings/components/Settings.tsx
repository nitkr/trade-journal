import { useState } from 'react';
import { AlertTriangle, Trash2, Database, FileX, Sun, Moon, Monitor, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTheme, type Theme } from '@/hooks/useTheme';

export function Settings() {
  const trades = useLiveQuery(() => db.trades.count(), []);
  const journalEntries = useLiveQuery(() => db.journalEntries.count(), []);
  const strategies = useLiveQuery(() => db.strategies.count(), []);
  const { theme, setTheme } = useTheme();

  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [isClearTradesOpen, setIsClearTradesOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await db.clearAllData();
      toast.success('All data cleared successfully');
      setIsClearAllOpen(false);
    } catch {
      toast.error('Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearTrades = async () => {
    setIsClearing(true);
    try {
      await db.clearTradesOnly();
      // Also clear metadata related to trades
      await db.setMetadata('totalRealizedPnl', 0);
      await db.setMetadata('totalCharges', 0);
      await db.setMetadata('hasOpenPositions', 0);
      toast.success('All trades cleared successfully');
      setIsClearTradesOpen(false);
    } catch {
      toast.error('Failed to clear trades');
    } finally {
      setIsClearing(false);
    }
  };

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Manage your data and application settings
        </p>
      </div>

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how Trade Journal looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`
                  flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
                  hover:border-primary/50 hover:bg-accent/50
                  ${theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground'}
                `}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {theme === 'system'
              ? 'Following your system settings'
              : theme === 'dark'
                ? 'Dark mode is on'
                : 'Light mode is on'}
          </p>
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Statistics
          </CardTitle>
          <CardDescription>Current data stored in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border">
              <p className="text-2xl font-bold">{trades ?? 0}</p>
              <p className="text-sm text-muted-foreground">Trades</p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-2xl font-bold">{journalEntries ?? 0}</p>
              <p className="text-sm text-muted-foreground">Journal Entries</p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-2xl font-bold">{strategies ?? 0}</p>
              <p className="text-sm text-muted-foreground">Strategies</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear Trades Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5" />
            Clear Trades
          </CardTitle>
          <CardDescription>
            Remove all trade records. Journal entries and strategies will be preserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isClearTradesOpen} onOpenChange={setIsClearTradesOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Trades
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Clear All Trades
                </DialogTitle>
                <DialogDescription>
                  This will permanently delete all {trades ?? 0} trade records. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsClearTradesOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleClearTrades} disabled={isClearing}>
                  {isClearing ? 'Clearing...' : 'Clear All Trades'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Clear All Data */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Clear All Data
          </CardTitle>
          <CardDescription>
            Permanently delete all trades, journal entries, and strategies. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isClearAllOpen} onOpenChange={setIsClearAllOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Everything
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Clear All Data
                </DialogTitle>
                <DialogDescription>
                  This will permanently delete all your data including {trades ?? 0} trades, {journalEntries ?? 0} journal entries, and {strategies ?? 0} strategies. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsClearAllOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleClearAll} disabled={isClearing}>
                  {isClearing ? 'Clearing...' : 'Clear Everything'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Trade Journal</strong> v1.0</p>
            <p>Your personal, powerful, local-first trading companion</p>
            <p>All data is stored locally on your device using IndexedDB</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}