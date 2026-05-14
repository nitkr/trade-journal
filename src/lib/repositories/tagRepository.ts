import { db } from '@/lib/db';
import type { Tag, TagInput } from '@/types';

export const tagRepository = {
  async getAll(): Promise<Tag[]> {
    return db.tags.orderBy('name').toArray();
  },

  async getById(id: number): Promise<Tag | undefined> {
    return db.tags.get(id);
  },

  async getByName(name: string): Promise<Tag | undefined> {
    return db.tags.where('name').equals(name).first();
  },

  async create(input: TagInput): Promise<Tag> {
    const existing = await this.getByName(input.name);
    if (existing) {
      return existing;
    }

    const tag: Tag = { ...input };
    const id = await db.tags.add(tag);
    return { ...tag, id };
  },

  async update(id: number, updates: Partial<TagInput>): Promise<Tag | undefined> {
    const existing = await db.tags.get(id);
    if (!existing) return undefined;

    const updatedData: Tag = {
      ...existing,
      ...updates,
    };

    await db.tags.update(id, updatedData);
    return updatedData;
  },

  async delete(id: number): Promise<void> {
    await db.tags.delete(id);
  },

  async getOrCreate(names: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];
    for (const name of names) {
      const existing = await this.getByName(name);
      if (existing) {
        tags.push(existing);
      } else {
        const created = await this.create({ name });
        tags.push(created);
      }
    }
    return tags;
  },
};