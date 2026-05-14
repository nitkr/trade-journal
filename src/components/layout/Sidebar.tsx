import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  FileText,
  TrendingUp,
  Import,
  Settings,
} from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'trades', label: 'Trade Log', icon: TrendingUp },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'strategies', label: 'Strategies', icon: FileText },
  { id: 'import-export', label: 'Import/Export', icon: Import },
];

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r bg-card h-full flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Trade Journal
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Your personal trading companion
        </p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                  onClick={() => onViewChange(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <Button
          variant={activeView === 'settings' ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start gap-3',
            activeView === 'settings' && 'bg-primary/10 text-primary'
          )}
          onClick={() => onViewChange('settings')}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </aside>
  );
}