import { db } from '@/lib/db';
import type { JournalEntry, JournalEntryInput } from '@/types';

export const journalRepository = {
  async getAll(): Promise<JournalEntry[]> {
    return db.journalEntries.orderBy('date').reverse().toArray();
  },

  async getById(id: number): Promise<JournalEntry | undefined> {
    return db.journalEntries.get(id);
  },

  async getByDate(date: string): Promise<JournalEntry | undefined> {
    return db.journalEntries.where('date').equals(date).first();
  },

  async getByDateRange(startDate: string, endDate: string): Promise<JournalEntry[]> {
    return db.journalEntries
      .where('date')
      .between(startDate, endDate, true, true)
      .reverse()
      .toArray();
  },

  async create(input: JournalEntryInput): Promise<JournalEntry> {
    const existing = await this.getByDate(input.date);
    if (existing) {
      const updated = await this.update(existing.id!, input);
      return updated!;
    }

    const entry: JournalEntry = {
      ...input,
      createdAt: new Date().toISOString(),
    };
    const id = await db.journalEntries.add(entry);
    return { ...entry, id };
  },

  async update(id: number, updates: Partial<JournalEntryInput>): Promise<JournalEntry | undefined> {
    const existing = await db.journalEntries.get(id);
    if (!existing) return undefined;

    const updatedData = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.journalEntries.update(id, updatedData);
    return { ...updatedData, id };
  },

  async delete(id: number): Promise<void> {
    await db.journalEntries.delete(id);
  },
};