import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { SEGMENTS, DIRECTIONS, EMOTION_LEVELS } from '@/lib/constants';
import type { Trade, TradeInput } from '@/types';
import { formatCurrency } from '@/lib/calculations';

interface TradeFormProps {
  trade?: Trade;
  onSubmit: (data: TradeInput) => void;
  onCancel?: () => void;
}

export function TradeForm({ trade, onSubmit, onCancel }: TradeFormProps) {
  const [tagInput, setTagInput] = useState('');
  const [formData, setFormData] = useState({
    date: trade?.date || format(new Date(), 'yyyy-MM-dd'),
    symbol: trade?.symbol || '',
    segment: trade?.segment || 'Equity',
    direction: trade?.direction || 'Long',
    entryPrice: trade?.entryPrice || 0,
    exitPrice: trade?.exitPrice || 0,
    quantity: trade?.quantity || 1,
    lotSize: trade?.lotSize || undefined as number | undefined,
    charges: trade?.charges || 0,
    tags: trade?.tags || [] as string[],
    emotion: trade?.emotion || 5,
    strategy: trade?.strategy || '',
    notes: trade?.notes || '',
  });

  const livePnl = calculateLivePnl(formData);

  const updateField = <K extends keyof typeof formData>(key: K, value: typeof formData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const selectedEmotion = EMOTION_LEVELS.find((e) => e.value === formData.emotion);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => updateField('date', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol</Label>
          <Input
            id="symbol"
            placeholder="e.g., NIFTY, RELIANCE"
            value={formData.symbol}
            onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Segment</Label>
          <Select value={formData.segment} onValueChange={(value) => updateField('segment', value as typeof formData.segment)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEGMENTS.map((segment) => (
                <SelectItem key={segment} value={segment}>
                  {segment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Direction</Label>
          <Select value={formData.direction} onValueChange={(value) => updateField('direction', value as typeof formData.direction)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIRECTIONS.map((direction) => (
                <SelectItem key={direction} value={direction}>
                  {direction}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="entryPrice">Entry Price</Label>
          <Input
            id="entryPrice"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.entryPrice}
            onChange={(e) => updateField('entryPrice', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exitPrice">Exit Price</Label>
          <Input
            id="exitPrice"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.exitPrice}
            onChange={(e) => updateField('exitPrice', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="1"
            value={formData.quantity}
            onChange={(e) => updateField('quantity', parseInt(e.target.value) || 1)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="charges">Charges (₹)</Label>
          <Input
            id="charges"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.charges}
            onChange={(e) => updateField('charges', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted space-y-2">
        <div className="flex items-center justify-between">
          <Label>Live P&L Calculation</Label>
          <Badge variant={livePnl >= 0 ? 'success' : 'destructive'} className="text-lg px-3 py-1">
            {livePnl >= 0 ? '+' : ''}
            {formatCurrency(livePnl)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formData.direction}: (Exit {formData.exitPrice} - Entry {formData.entryPrice}) × {formData.quantity} - ₹{formData.charges}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="strategy">Strategy (Optional)</Label>
        <Input
          id="strategy"
          placeholder="e.g., Breakout, Mean Reversion"
          value={formData.strategy}
          onChange={(e) => updateField('strategy', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Emotion (1-10)</Label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="10"
            value={formData.emotion}
            onChange={(e) => updateField('emotion', parseInt(e.target.value) || 5)}
            className="flex-1"
          />
          {selectedEmotion && <span className="text-2xl">{selectedEmotion.emoji}</span>}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Calm</span>
          <span>Panic</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Add a tag" />
          <Button type="button" variant="outline" onClick={addTag}>
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Trade notes, setup description, lessons learned..."
          rows={3}
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">{trade ? 'Update Trade' : 'Add Trade'}</Button>
      </div>
    </form>
  );
}

function calculateLivePnl(data: {
  direction: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  charges: number;
}): number {
  const { direction, entryPrice, exitPrice, quantity, charges } = data;
  const multiplier = direction === 'Long' ? 1 : -1;
  const grossPnl = (exitPrice - entryPrice) * quantity * multiplier;
  return grossPnl - charges;
}