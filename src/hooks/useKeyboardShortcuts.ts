import { useEffect, useCallback } from 'react';

interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  onNavigate?: (view: string) => void;
  onAddTrade?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNavigate,
  onAddTrade,
  enabled = true,
}: UseKeyboardShortcutsOptions = {}) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs/textareas
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      // Navigation shortcuts (Ctrl/Cmd + Number)
      if (ctrlOrMeta) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            onNavigate?.('dashboard');
            break;
          case '2':
            event.preventDefault();
            onNavigate?.('trades');
            break;
          case '3':
            event.preventDefault();
            onNavigate?.('journal');
            break;
          case '4':
            event.preventDefault();
            onNavigate?.('analytics');
            break;
          case '5':
            event.preventDefault();
            onNavigate?.('strategies');
            break;
          case '6':
            event.preventDefault();
            onNavigate?.('import-export');
            break;
          case 'n':
            event.preventDefault();
            onAddTrade?.();
            break;
        }
      }

      // Direct navigation keys (when no modifier)
      if (!ctrlOrMeta && !event.shiftKey && !event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'd':
            event.preventDefault();
            onNavigate?.('dashboard');
            break;
          case 't':
            event.preventDefault();
            onNavigate?.('trades');
            break;
          case 'j':
            event.preventDefault();
            onNavigate?.('journal');
            break;
          case 'a':
            event.preventDefault();
            onNavigate?.('analytics');
            break;
          case 's':
            event.preventDefault();
            onNavigate?.('strategies');
            break;
          case 'i':
            event.preventDefault();
            onNavigate?.('import-export');
            break;
        }
      }
    },
    [enabled, onNavigate, onAddTrade]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const SHORTCUTS: ShortcutHandler[] = [
  { key: 'Ctrl+1', action: () => {}, description: 'Go to Dashboard' },
  { key: 'Ctrl+2', action: () => {}, description: 'Go to Trade Log' },
  { key: 'Ctrl+3', action: () => {}, description: 'Go to Journal' },
  { key: 'Ctrl+4', action: () => {}, description: 'Go to Analytics' },
  { key: 'Ctrl+5', action: () => {}, description: 'Go to Strategies' },
  { key: 'Ctrl+6', action: () => {}, description: 'Go to Import/Export' },
  { key: 'Ctrl+N', action: () => {}, description: 'New Trade' },
  { key: 'D', action: () => {}, description: 'Go to Dashboard' },
  { key: 'T', action: () => {}, description: 'Go to Trade Log' },
  { key: 'J', action: () => {}, description: 'Go to Journal' },
  { key: 'A', action: () => {}, description: 'Go to Analytics' },
  { key: 'S', action: () => {}, description: 'Go to Strategies' },
  { key: 'I', action: () => {}, description: 'Go to Import/Export' },
];