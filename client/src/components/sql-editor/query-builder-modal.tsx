import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Plus, Database, Columns, Parentheses, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { TableSchema } from "@shared/schema";

interface QueryBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (sqlQuery: string) => void;
}

interface SelectedColumn {
  id: string;
  table: string;
  column: string;
  type: 'column' | 'function';
  functionType?: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';
  alias?: string;
}

export function QueryBuilderModal({ isOpen, onClose, onApply }: QueryBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set(['water_meter_readings']));
  const [selectedColumns, setSelectedColumns] = useState<SelectedColumn[]>([
    { id: '1', table: 'water_meter_readings', column: 'meter_id', type: 'column' },
    { id: '2', table: 'water_meter_readings', column: 'usage_gallons', type: 'function', functionType: 'SUM', alias: 'total_usage' },
    { id: '3', table: 'water_meter_readings', column: 'location_zone', type: 'column' }
  ]);

  const { data: schemas, isLoading } = useQuery<TableSchema[]>({
    queryKey: ['/api/schema'],
    enabled: isOpen,
  });

  const toggleTable = (tableName: string) => {
    const newSelected = new Set(selectedTables);
    if (newSelected.has(tableName)) {
      newSelected.delete(tableName);
      // Remove columns from unselected tables
      setSelectedColumns(prev => prev.filter(col => col.table !== tableName));
    } else {
      newSelected.add(tableName);
    }
    setSelectedTables(newSelected);
  };

  const removeColumn = (columnId: string) => {
    setSelectedColumns(prev => prev.filter(col => col.id !== columnId));
  };

  const addColumn = (tableName: string, columnName: string, columnType: string) => {
    const newColumn: SelectedColumn = {
      id: `${Date.now()}-${Math.random()}`,
      table: tableName,
      column: columnName,
      type: 'column'
    };
    
    // If it's a numeric column, suggest an aggregation
    if (columnType.includes('numeric') || columnType.includes('integer')) {
      newColumn.type = 'function';
      newColumn.functionType = 'SUM';
      newColumn.alias = `total_${columnName}`;
    }
    
    setSelectedColumns(prev => [...prev, newColumn]);
  };

  const generateSQL = () => {
    if (selectedColumns.length === 0) return '';

    const selectClause = selectedColumns.map(col => {
      if (col.type === 'function' && col.functionType) {
        return col.alias 
          ? `${col.functionType}(${col.column}) AS ${col.alias}`
          : `${col.functionType}(${col.column})`;
      }
      return col.column;
    }).join(',\n    ');

    const fromClause = Array.from(selectedTables)[0]; // Simplified for now

    const groupByColumns = selectedColumns
      .filter(col => col.type === 'column')
      .map(col => col.column);

    const hasAggregates = selectedColumns.some(col => col.type === 'function');

    let query = `SELECT\n    ${selectClause}\nFROM ${fromClause}`;

    if (hasAggregates && groupByColumns.length > 0) {
      query += `\nGROUP BY ${groupByColumns.join(', ')}`;
    }

    // Add sample filter for water meter readings
    if (selectedTables.has('water_meter_readings')) {
      query += `\nWHERE reading_date >= '2024-01-01'`;
    }

    if (hasAggregates) {
      const firstAggregate = selectedColumns.find(col => col.type === 'function');
      if (firstAggregate) {
        const orderByColumn = firstAggregate.alias || `${firstAggregate.functionType}(${firstAggregate.column})`;
        query += `\nORDER BY ${orderByColumn} DESC`;
      }
    }

    return query;
  };

  const handleApply = () => {
    const sqlQuery = generateSQL();
    if (sqlQuery) {
      onApply(sqlQuery);
      onClose();
    }
  };

  const steps = [
    { number: 1, title: 'Select Tables', active: currentStep === 1 },
    { number: 2, title: 'Choose Columns', active: currentStep === 2 },
    { number: 3, title: 'Add Filters', active: currentStep === 3 },
    { number: 4, title: 'Generate Query', active: currentStep === 4 }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Visual Query Builder</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mb-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  step.active
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.active ? 'bg-blue-500 text-white' : 'bg-slate-400 text-white'
                }`}>
                  {step.number}
                </div>
                <span className="font-medium">{step.title}</span>
              </div>
            ))}
          </div>

          {/* Table Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Available Tables</h3>
              {isLoading ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {schemas?.map((schema) => (
                    <div
                      key={schema.name}
                      className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedTables.has(schema.name)}
                          onCheckedChange={() => toggleTable(schema.name)}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100">
                            {schema.name}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {schema.name === 'water_meter_readings' && 'Water consumption data with timestamps'}
                            {schema.name === 'customer_billing' && 'Customer invoices and payment records'}
                            {schema.name === 'customer_profiles' && 'Customer information and demographics'}
                            {schema.name === 'service_locations' && 'Service location and meter information'}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {schema.columns.length} columns
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {schema.rowCount.toLocaleString()} rows
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Selected Columns</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {column.type === 'function' ? (
                        <Parentheses className="w-4 h-4 text-green-500" />
                      ) : (
                        <Columns className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {column.type === 'function' && column.functionType
                          ? `${column.functionType}(${column.column})`
                          : column.column}
                        {column.alias && ` AS ${column.alias}`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeColumn(column.id)}
                      className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Available Columns from Selected Tables */}
              {Array.from(selectedTables).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Available Columns</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {schemas?.filter(schema => selectedTables.has(schema.name)).map(schema => 
                      schema.columns.map(column => (
                        <Button
                          key={`${schema.name}-${column.name}`}
                          variant="outline"
                          size="sm"
                          onClick={() => addColumn(schema.name, column.name, column.type)}
                          className="w-full justify-start text-xs"
                          disabled={selectedColumns.some(col => col.table === schema.name && col.column === column.name)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {schema.name}.{column.name}
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {column.type}
                          </Badge>
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generated SQL Preview */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Generated SQL</h3>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-100 overflow-x-auto">
              <pre className="whitespace-pre-wrap">
                {generateSQL() || 'Select tables and columns to generate SQL...'}
              </pre>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={selectedColumns.length === 0}>
            Apply to Editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
