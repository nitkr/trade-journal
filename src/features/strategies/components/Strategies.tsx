import { useLiveQuery } from 'dexie-react-hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { strategyRepository } from '@/lib/repositories';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function Strategies() {
  const strategies = useLiveQuery(() => strategyRepository.getAll(), []);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRules, setNewRules] = useState('');
  const [editingStrategy, setEditingStrategy] = useState<{ id: number; name: string; description?: string; rules?: string } | null>(null);
  const [deletingStrategy, setDeletingStrategy] = useState<{ id: number; name: string } | null>(null);

  const handleAddStrategy = async () => {
    if (!newName.trim()) {
      toast.error('Strategy name is required');
      return;
    }

    try {
      await strategyRepository.create({
        name: newName,
        description: newDescription || undefined,
        rules: newRules || undefined,
      });
      setNewName('');
      setNewDescription('');
      setNewRules('');
      setIsAddOpen(false);
      toast.success('Strategy created');
    } catch {
      toast.error('Failed to create strategy');
    }
  };

  const handleUpdateStrategy = async () => {
    if (!editingStrategy || !editingStrategy.name.trim()) {
      toast.error('Strategy name is required');
      return;
    }

    try {
      await strategyRepository.update(editingStrategy.id, {
        name: editingStrategy.name,
        description: editingStrategy.description || undefined,
        rules: editingStrategy.rules || undefined,
      });
      setEditingStrategy(null);
      toast.success('Strategy updated');
    } catch {
      toast.error('Failed to update strategy');
    }
  };

  const handleDeleteStrategy = async () => {
    if (!deletingStrategy?.id) return;

    try {
      await strategyRepository.delete(deletingStrategy.id);
      setDeletingStrategy(null);
      toast.success('Strategy deleted');
    } catch {
      toast.error('Failed to delete strategy');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Strategies</h2>
          <p className="text-muted-foreground">
            Define and track your trading playbooks
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Strategy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Strategy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Breakout Trading"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the strategy..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rules">Rules</Label>
                <Textarea
                  id="rules"
                  value={newRules}
                  onChange={(e) => setNewRules(e.target.value)}
                  placeholder="Entry rules, exit rules, risk management..."
                />
              </div>
              <Button onClick={handleAddStrategy} className="w-full">
                Create Strategy
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!strategies || strategies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No strategies yet. Create your first trading playbook!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {strategies.map((strategy) => (
            <Card key={strategy.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                  <CardTitle>{strategy.name}</CardTitle>
                  {strategy.description && (
                    <CardDescription>{strategy.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setEditingStrategy({ id: strategy.id, name: strategy.name, description: strategy.description, rules: strategy.rules })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingStrategy({ id: strategy.id, name: strategy.name })} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {strategy.rules && (
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{strategy.rules}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Strategy Dialog */}
      <Dialog open={!!editingStrategy} onOpenChange={() => setEditingStrategy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Strategy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editingStrategy?.name || ''}
                onChange={(e) => setEditingStrategy(editingStrategy ? { ...editingStrategy, name: e.target.value } : null)}
                placeholder="e.g., Breakout Trading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingStrategy?.description || ''}
                onChange={(e) => setEditingStrategy(editingStrategy ? { ...editingStrategy, description: e.target.value } : null)}
                placeholder="Describe the strategy..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rules">Rules</Label>
              <Textarea
                id="edit-rules"
                value={editingStrategy?.rules || ''}
                onChange={(e) => setEditingStrategy(editingStrategy ? { ...editingStrategy, rules: e.target.value } : null)}
                placeholder="Entry rules, exit rules, risk management..."
              />
            </div>
            <Button onClick={handleUpdateStrategy} className="w-full">
              Update Strategy
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Strategy Dialog */}
      <Dialog open={!!deletingStrategy} onOpenChange={() => setDeletingStrategy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Strategy</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete <strong>{deletingStrategy?.name}</strong>?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeletingStrategy(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteStrategy}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}