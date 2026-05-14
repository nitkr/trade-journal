export interface JournalEntry {
  id?: number;
  date: string;
  preMarketBias?: string;
  postMarketReview?: string;
  emotion: number;
  lessons?: string;
  marketConditions?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface JournalEntryInput {
  date: string;
  preMarketBias?: string;
  postMarketReview?: string;
  emotion: number;
  lessons?: string;
  marketConditions?: string;
  tags?: string[];
}