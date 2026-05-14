import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/calculations';

interface PositionSizeResult {
  quantity: number;
  riskAmount: number;
  positionValue: number;
  rewardRiskRatio: number;
  maxLoss: number;
  maxProfit: number;
}

export function PositionSizeCalculator() {
  const [accountBalance, setAccountBalance] = useState<string>('');
  const [riskPercent, setRiskPercent] = useState<string>('1');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');

  const result = useMemo<PositionSizeResult | null>(() => {
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(riskPercent);
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLossPrice);
    const target = parseFloat(targetPrice);

    if (isNaN(balance) || isNaN(risk) || isNaN(entry) || isNaN(sl) || balance <= 0 || risk <= 0 || entry <= 0 || sl <= 0) {
      return null;
    }

    // Calculate risk amount in rupees
    const riskAmount = (balance * risk) / 100;

    // Calculate stop loss distance per share
    const stopLossDistance = Math.abs(entry - sl);

    if (stopLossDistance === 0) return null;

    // Calculate quantity based on risk
    const quantity = Math.floor(riskAmount / stopLossDistance);

    // Position value
    const positionValue = quantity * entry;

    // Max loss (risk amount)
    const maxLoss = quantity * stopLossDistance;

    // Reward/Risk ratio
    let rewardRiskRatio = 0;
    if (target > 0 && sl > 0) {
      const reward = Math.abs(target - entry);
      rewardRiskRatio = reward / stopLossDistance;
    }

    // Max profit
    const maxProfit = target > 0 ? quantity * Math.abs(target - entry) : 0;

    return {
      quantity,
      riskAmount,
      positionValue,
      rewardRiskRatio,
      maxLoss,
      maxProfit,
    };
  }, [accountBalance, riskPercent, entryPrice, stopLossPrice, targetPrice]);

  const handleClear = () => {
    setAccountBalance('');
    setRiskPercent('1');
    setEntryPrice('');
    setStopLossPrice('');
    setTargetPrice('');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calculator className="h-4 w-4 mr-2" />
          Position Size
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Position Sizing Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Account Balance */}
          <div className="space-y-2">
            <Label htmlFor="balance">Account Balance (₹)</Label>
            <Input
              id="balance"
              type="number"
              placeholder="100000"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
            />
          </div>

          {/* Risk Percent */}
          <div className="space-y-2">
            <Label htmlFor="risk">Risk Per Trade (%)</Label>
            <Input
              id="risk"
              type="number"
              placeholder="1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
            />
          </div>

          {/* Entry Price */}
          <div className="space-y-2">
            <Label htmlFor="entry">Entry Price (₹)</Label>
            <Input
              id="entry"
              type="number"
              placeholder="1500"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
            />
          </div>

          {/* Stop Loss Price */}
          <div className="space-y-2">
            <Label htmlFor="sl">Stop Loss Price (₹)</Label>
            <Input
              id="sl"
              type="number"
              placeholder="1450"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
            />
          </div>

          {/* Target Price (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="target">Target Price (₹) - Optional</Label>
            <Input
              id="target"
              type="number"
              placeholder="1600"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </div>

          {/* Results */}
          {result && (
            <div className="mt-6 p-4 bg-muted rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">Calculated Position</h4>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="text-xl font-bold">{result.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Position Value</p>
                  <p className="text-xl font-bold">{formatCurrency(result.positionValue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Risk Amount</p>
                  <p className="text-xl font-bold text-red-500">{formatCurrency(result.riskAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Loss</p>
                  <p className="text-xl font-bold text-red-500">{formatCurrency(result.maxLoss)}</p>
                </div>
                {result.maxProfit > 0 && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Max Profit</p>
                      <p className="text-xl font-bold text-green-500">{formatCurrency(result.maxProfit)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reward:Risk</p>
                      <p className="text-xl font-bold">{result.rewardRiskRatio.toFixed(2)}:1</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Position sizing helps you determine how many shares to buy based on your account size
              and risk tolerance. Never risk more than 1-2% of your account on a single trade.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClear} className="flex-1">
              Clear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}