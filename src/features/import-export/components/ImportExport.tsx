import { useRef, useState } from 'react';
import { Upload, Download, FileJson, FileSpreadsheet, File, Files } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrades } from '@/hooks/useTrades';
import { useImportExport } from './useImportExport';
import { toast } from 'sonner';

export function ImportExport() {
  const { trades } = useTrades();
  const { exportToCsv, exportToJson, importFromCsv, importFromJson, importFromZerodhaCombined } = useImportExport();

  // Combined import state
  const [combinedStep, setCombinedStep] = useState<'idle' | 'selectPL' | 'selectTradebook'>('idle');
  const [plFile, setPlFile] = useState<File | null>(null);
  const [_tradebookFile, setTradebookFile] = useState<File | null>(null);
  const combinedPlInputRef = useRef<HTMLInputElement>(null);
  const combinedTradebookInputRef = useRef<HTMLInputElement>(null);

  // Generic import refs
  const csvImportInputRef = useRef<HTMLInputElement>(null);
  const jsonImportInputRef = useRef<HTMLInputElement>(null);

  const handleExportCsv = () => {
    exportToCsv(trades);
  };

  const handleExportJson = () => {
    exportToJson(trades);
  };

  // Combined import handlers
  const handleStartCombinedImport = () => {
    setCombinedStep('selectPL');
    setPlFile(null);
    setTradebookFile(null);
  };

  const handleCombinedPLSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlFile(file);
    setCombinedStep('selectTradebook');
    e.target.value = '';
  };

  const handleCombinedTradebookSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTradebookFile(file);

    // Auto-trigger import once both files are selected
    try {
      const result = await importFromZerodhaCombined(plFile!, file);
      toast.success(`Combined import complete: ${result.trades} trades`);
      setCombinedStep('idle');
      setPlFile(null);
      setTradebookFile(null);
    } catch (error) {
      console.error(error);
      toast.error('Combined import failed');
      setCombinedStep('idle');
    }

    e.target.value = '';
  };

  const handleCancelCombined = () => {
    setCombinedStep('idle');
    setPlFile(null);
    setTradebookFile(null);
  };

  // Generic import handlers for exported data
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importFromCsv(file);
      toast.success(`Imported ${count} trades from CSV`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to import CSV file');
    }
    e.target.value = '';
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importFromJson(file);
      toast.success(`Imported ${count} trades from JSON`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to import JSON file');
    }
    e.target.value = '';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Import / Export</h2>
        <p className="text-muted-foreground">
          Backup your data or import trades from other platforms
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download your trade data for backup or analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You have <strong>{trades.length}</strong> trades recorded.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleExportCsv} variant="outline" className="flex-1">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleExportJson} variant="outline" className="flex-1">
                <FileJson className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>

            {/* Import section for exported data */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Import Exported Data</p>
              <p className="text-xs text-muted-foreground mb-3">
                Import trades from previously exported CSV or JSON files.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => csvImportInputRef.current?.click()} variant="outline" size="sm" className="flex-1">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button onClick={() => jsonImportInputRef.current?.click()} variant="outline" size="sm" className="flex-1">
                  <FileJson className="h-4 w-4 mr-2" />
                  Import JSON
                </Button>
              </div>
              <input
                ref={csvImportInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCsv}
                className="hidden"
              />
              <input
                ref={jsonImportInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Import trades from Zerodha P&L and Tradebook files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Note:</strong> This import supports Zerodha exports only. To get the most accurate results, use both the P&L Excel file and Tradebook CSV together.
            </p>

            {/* Combined Import Section */}
            <div className="p-4 rounded-lg border border-primary/50 bg-primary/5">
              {combinedStep === 'idle' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Files className="h-5 w-5" />
                    <h4 className="font-medium">Combined Import (Recommended)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Import both P&L (xlsx) and Tradebook (csv) for accurate trade dates AND realized P&L values.
                  </p>
                  <Button
                    onClick={handleStartCombinedImport}
                    variant="default"
                    className="w-full"
                  >
                    <Files className="h-4 w-4 mr-2" />
                    Start Combined Import
                  </Button>
                </>
              )}

              {combinedStep === 'selectPL' && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</div>
                      <span className="font-medium">Select P&L File (xlsx)</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCancelCombined}>Cancel</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select the Zerodha P&L Excel file (.xlsx) - contains realized P&L values
                  </p>
                  <Button
                    onClick={() => combinedPlInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Select P&L File
                  </Button>
                  <input
                    ref={combinedPlInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleCombinedPLSelect}
                    className="hidden"
                  />
                </>
              )}

              {combinedStep === 'selectTradebook' && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</div>
                      <span className="font-medium">Select Tradebook (csv)</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCancelCombined}>Cancel</Button>
                  </div>
                  <div className="p-2 rounded bg-muted/50 mb-2">
                    <p className="text-xs">
                      <span className="font-medium">P&L file selected:</span> {plFile?.name}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select the Zerodha Tradebook CSV file - contains actual trade dates
                  </p>
                  <Button
                    onClick={() => combinedTradebookInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    <File className="h-4 w-4 mr-2" />
                    Select Tradebook CSV
                  </Button>
                  <input
                    ref={combinedTradebookInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCombinedTradebookSelect}
                    className="hidden"
                  />
                </>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">How to get Zerodha files:</p>
              <p>1. Go to <strong>Console → Portfolio → P&L</strong> and download the Excel sheet</p>
              <p>2. Go to <strong>Console → Portfolio → Tradebook</strong> and export as CSV</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}