import Dexie, { type Table } from 'dexie';
import type { Trade, JournalEntry, Strategy, Tag } from '@/types';

export interface AppMetadata {
  key: string;
  value: number;
  updatedAt: string;
}

export class TradeJournalDB extends Dexie {
  trades!: Table<Trade, number>;
  journalEntries!: Table<JournalEntry, number>;
  strategies!: Table<Strategy, number>;
  tags!: Table<Tag, number>;
  appMetadata!: Table<AppMetadata, string>;

  constructor() {
    super('TradeJournalDB');

    this.version(1).stores({
      trades: '++id, date, symbol, segment, direction, strategy, *tags, createdAt',
      journalEntries: '++id, date, createdAt',
      strategies: '++id, name, createdAt',
      tags: '++id, name',
    });

    this.version(2).stores({
      trades: '++id, date, symbol, segment, direction, strategy, *tags, createdAt',
      journalEntries: '++id, date, createdAt',
      strategies: '++id, name, createdAt',
      tags: '++id, name',
      appMetadata: 'key',
    });
  }

  async clearAllData(): Promise<void> {
    await this.trades.clear();
    await this.journalEntries.clear();
    await this.strategies.clear();
    await this.tags.clear();
    await this.appMetadata.clear();
  }

  async clearTradesOnly(): Promise<void> {
    await this.trades.clear();
  }

  async setMetadata(key: string, value: number): Promise<void> {
    await this.appMetadata.put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
  }

  async getMetadata(key: string): Promise<number | null> {
    const record = await this.appMetadata.get(key);
    return record?.value ?? null;
  }
}

export const db = new TradeJournalDB();

// Debug helper - expose db to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).db = db;
}