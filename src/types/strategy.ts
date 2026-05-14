export interface Strategy {
  id?: number;
  name: string;
  description?: string;
  rules?: string;
  createdAt: string;
}

export interface StrategyInput {
  name: string;
  description?: string;
  rules?: string;
}