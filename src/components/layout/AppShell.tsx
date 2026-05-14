import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { PWAInstallPrompt } from '@/components/shared/PWAInstallPrompt';

interface AppShellProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

export function AppShell({ children, activeView, onViewChange }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={onViewChange} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster />
      <PWAInstallPrompt />
    </div>
  );
}