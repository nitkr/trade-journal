import { useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/features/dashboard/components/Dashboard';
import { TradeLog } from '@/features/trades/components/TradeLog';
import { Journal } from '@/features/journal/components/Journal';
import { Analytics } from '@/features/analytics/components/Analytics';
import { Strategies } from '@/features/strategies/components/Strategies';
import { ImportExport } from '@/features/import-export/components/ImportExport';
import { Settings } from '@/features/settings/components/Settings';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);

  const handleAddTrade = useCallback(() => {
    setIsAddTradeOpen(true);
  }, []);

  useKeyboardShortcuts({
    onNavigate: setActiveView,
    onAddTrade: handleAddTrade,
  });

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'trades':
        return <TradeLog triggerAddTrade={isAddTradeOpen} onAddTradeOpened={() => setIsAddTradeOpen(false)} />;
      case 'journal':
        return <Journal />;
      case 'analytics':
        return <Analytics />;
      case 'strategies':
        return <Strategies />;
      case 'import-export':
        return <ImportExport />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {renderView()}
    </AppShell>
  );
}

export default App;