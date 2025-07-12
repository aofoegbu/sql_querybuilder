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

interface InsertValue {
  column: string;
  value: string;
  type: string;
}

interface UpdateCondition {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: string;
}

interface NewColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

export function QueryBuilderModal({ isOpen, onClose, onApply }: QueryBuilderModalProps) {
  const [queryType, setQueryType] = useState<'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE'>('SELECT');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set(['water_meter_readings']));
  const [selectedColumns, setSelectedColumns] = useState<SelectedColumn[]>([
    { id: '1', table: 'water_meter_readings', column: 'meter_id', type: 'column' },
    { id: '2', table: 'water_meter_readings', column: 'usage_gallons', type: 'function', functionType: 'SUM', alias: 'total_usage' },
    { id: '3', table: 'water_meter_readings', column: 'location_zone', type: 'column' }
  ]);
  const [insertValues, setInsertValues] = useState<InsertValue[]>([]);
  const [updateValues, setUpdateValues] = useState<InsertValue[]>([]);
  const [conditions, setConditions] = useState<UpdateCondition[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [newColumns, setNewColumns] = useState<NewColumn[]>([]);

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
    const tableName = Array.from(selectedTables)[0];
    
    switch (queryType) {
      case 'SELECT':
        return generateSelectQuery();
      case 'INSERT':
        return generateInsertQuery(tableName);
      case 'UPDATE':
        return generateUpdateQuery(tableName);
      case 'DELETE':
        return generateDeleteQuery(tableName);
      case 'CREATE':
        return generateCreateQuery();
      default:
        return '';
    }
  };

  const generateSelectQuery = () => {
    if (selectedColumns.length === 0) return '';

    const selectClause = selectedColumns.map(col => {
      if (col.type === 'function' && col.functionType) {
        return col.alias 
          ? `${col.functionType}(${col.column}) AS ${col.alias}`
          : `${col.functionType}(${col.column})`;
      }
      return col.column;
    }).join(',\n    ');

    const fromClause = Array.from(selectedTables)[0];
    const groupByColumns = selectedColumns
      .filter(col => col.type === 'column')
      .map(col => col.column);
    const hasAggregates = selectedColumns.some(col => col.type === 'function');

    let query = `SELECT\n    ${selectClause}\nFROM ${fromClause}`;

    if (hasAggregates && groupByColumns.length > 0) {
      query += `\nGROUP BY ${groupByColumns.join(', ')}`;
    }

    if (conditions.length > 0) {
      const whereClause = conditions.map(cond => 
        `${cond.column} ${cond.operator} '${cond.value}'`
      ).join(' AND ');
      query += `\nWHERE ${whereClause}`;
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

  const generateInsertQuery = (tableName: string) => {
    if (insertValues.length === 0) return '';
    
    const columns = insertValues.map(val => val.column).join(', ');
    const values = insertValues.map(val => {
      if (val.type.includes('varchar') || val.type.includes('text') || val.type.includes('timestamp')) {
        return `'${val.value}'`;
      }
      return val.value;
    }).join(', ');

    return `INSERT INTO ${tableName} (${columns})\nVALUES (${values});`;
  };

  const generateUpdateQuery = (tableName: string) => {
    if (updateValues.length === 0 || conditions.length === 0) return '';
    
    const setClause = updateValues.map(val => {
      const value = val.type.includes('varchar') || val.type.includes('text') || val.type.includes('timestamp')
        ? `'${val.value}'` : val.value;
      return `${val.column} = ${value}`;
    }).join(',\n    ');

    const whereClause = conditions.map(cond => 
      `${cond.column} ${cond.operator} '${cond.value}'`
    ).join(' AND ');

    return `UPDATE ${tableName}\nSET ${setClause}\nWHERE ${whereClause};`;
  };

  const generateDeleteQuery = (tableName: string) => {
    if (conditions.length === 0) return '';
    
    const whereClause = conditions.map(cond => 
      `${cond.column} ${cond.operator} '${cond.value}'`
    ).join(' AND ');

    return `DELETE FROM ${tableName}\nWHERE ${whereClause};`;
  };

  const generateCreateQuery = () => {
    if (!newTableName || newColumns.length === 0) return '';
    
    const columnDefs = newColumns.map(col => {
      let def = `${col.name} ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
      return def;
    }).join(',\n    ');

    return `CREATE TABLE ${newTableName} (\n    ${columnDefs}\n);`;
  };

  const handleApply = () => {
    const sqlQuery = generateSQL();
    if (sqlQuery) {
      onApply(sqlQuery);
      onClose();
    }
  };

  const getStepsForQueryType = () => {
    switch (queryType) {
      case 'SELECT':
        return [
          { number: 1, title: 'Select Tables', active: currentStep === 1 },
          { number: 2, title: 'Choose Columns', active: currentStep === 2 },
          { number: 3, title: 'Add Filters', active: currentStep === 3 },
          { number: 4, title: 'Generate Query', active: currentStep === 4 }
        ];
      case 'INSERT':
        return [
          { number: 1, title: 'Select Table', active: currentStep === 1 },
          { number: 2, title: 'Set Values', active: currentStep === 2 },
          { number: 3, title: 'Generate Query', active: currentStep === 3 }
        ];
      case 'UPDATE':
        return [
          { number: 1, title: 'Select Table', active: currentStep === 1 },
          { number: 2, title: 'Set Values', active: currentStep === 2 },
          { number: 3, title: 'Add Conditions', active: currentStep === 3 },
          { number: 4, title: 'Generate Query', active: currentStep === 4 }
        ];
      case 'DELETE':
        return [
          { number: 1, title: 'Select Table', active: currentStep === 1 },
          { number: 2, title: 'Add Conditions', active: currentStep === 2 },
          { number: 3, title: 'Generate Query', active: currentStep === 3 }
        ];
      case 'CREATE':
        return [
          { number: 1, title: 'Table Name', active: currentStep === 1 },
          { number: 2, title: 'Define Columns', active: currentStep === 2 },
          { number: 3, title: 'Generate Query', active: currentStep === 3 }
        ];
      default:
        return [];
    }
  };

  const steps = getStepsForQueryType();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Visual Query Builder</DialogTitle>
          
          {/* Query Type Selector */}
          <div className="flex items-center space-x-2 mt-4">
            <span className="text-sm font-medium">Query Type:</span>
            {(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE'] as const).map(type => (
              <Button
                key={type}
                variant={queryType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setQueryType(type);
                  setCurrentStep(1);
                  // Reset state when changing query type
                  if (type !== 'SELECT') {
                    setSelectedColumns([]);
                    setSelectedTables(new Set());
                  }
                }}
                className="text-xs"
              >
                {type}
              </Button>
            ))}
          </div>
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

          {/* Content based on query type */}
          {queryType === 'SELECT' && (
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
          )}

          {/* INSERT Query Interface */}
          {queryType === 'INSERT' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Select Table for Insert</h3>
                <div className="grid grid-cols-2 gap-4">
                  {schemas?.map((schema) => (
                    <Button
                      key={schema.name}
                      variant={selectedTables.has(schema.name) ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedTables(new Set([schema.name]));
                        // Initialize insert values for this table
                        setInsertValues(schema.columns.slice(0, 5).map(col => ({
                          column: col.name,
                          value: '',
                          type: col.type
                        })));
                      }}
                      className="p-4 h-auto flex-col"
                    >
                      <span className="font-medium">{schema.name}</span>
                      <span className="text-xs opacity-70">{schema.columns.length} columns</span>
                    </Button>
                  ))}
                </div>
              </div>

              {Array.from(selectedTables).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Set Values</h3>
                  <div className="space-y-3">
                    {insertValues.map((value, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-1/3">
                          <span className="text-sm font-medium">{value.column}</span>
                          <div className="text-xs text-slate-500">{value.type}</div>
                        </div>
                        <input
                          type="text"
                          value={value.value}
                          onChange={(e) => {
                            const newValues = [...insertValues];
                            newValues[index].value = e.target.value;
                            setInsertValues(newValues);
                          }}
                          placeholder={`Enter ${value.column} value`}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPDATE Query Interface */}
          {queryType === 'UPDATE' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Select Table for Update</h3>
                <div className="grid grid-cols-2 gap-4">
                  {schemas?.map((schema) => (
                    <Button
                      key={schema.name}
                      variant={selectedTables.has(schema.name) ? 'default' : 'outline'}
                      onClick={() => setSelectedTables(new Set([schema.name]))}
                      className="p-4 h-auto flex-col"
                    >
                      <span className="font-medium">{schema.name}</span>
                      <span className="text-xs opacity-70">{schema.columns.length} columns</span>
                    </Button>
                  ))}
                </div>
              </div>

              {Array.from(selectedTables).length > 0 && (
                <>
                  <div>
                    <h3 className="text-lg font-medium mb-4">Set New Values</h3>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const schema = schemas?.find(s => selectedTables.has(s.name));
                        if (schema) {
                          setUpdateValues([...updateValues, {
                            column: schema.columns[0].name,
                            value: '',
                            type: schema.columns[0].type
                          }]);
                        }
                      }}
                      className="mb-3"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Update Field
                    </Button>
                    <div className="space-y-3">
                      {updateValues.map((value, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <select
                            value={value.column}
                            onChange={(e) => {
                              const newValues = [...updateValues];
                              newValues[index].column = e.target.value;
                              setUpdateValues(newValues);
                            }}
                            className="w-1/3 px-3 py-2 border border-slate-300 rounded-md"
                          >
                            {schemas?.find(s => selectedTables.has(s.name))?.columns.map(col => (
                              <option key={col.name} value={col.name}>{col.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={value.value}
                            onChange={(e) => {
                              const newValues = [...updateValues];
                              newValues[index].value = e.target.value;
                              setUpdateValues(newValues);
                            }}
                            placeholder="New value"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Where Conditions</h3>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const schema = schemas?.find(s => selectedTables.has(s.name));
                        if (schema) {
                          setConditions([...conditions, {
                            column: schema.columns[0].name,
                            operator: '=',
                            value: ''
                          }]);
                        }
                      }}
                      className="mb-3"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Condition
                    </Button>
                    <div className="space-y-3">
                      {conditions.map((condition, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <select
                            value={condition.column}
                            onChange={(e) => {
                              const newConditions = [...conditions];
                              newConditions[index].column = e.target.value;
                              setConditions(newConditions);
                            }}
                            className="w-1/4 px-3 py-2 border border-slate-300 rounded-md"
                          >
                            {schemas?.find(s => selectedTables.has(s.name))?.columns.map(col => (
                              <option key={col.name} value={col.name}>{col.name}</option>
                            ))}
                          </select>
                          <select
                            value={condition.operator}
                            onChange={(e) => {
                              const newConditions = [...conditions];
                              newConditions[index].operator = e.target.value as any;
                              setConditions(newConditions);
                            }}
                            className="w-1/6 px-3 py-2 border border-slate-300 rounded-md"
                          >
                            <option value="=">=</option>
                            <option value="!=">!=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="<=">&lt;=</option>
                            <option value="LIKE">LIKE</option>
                          </select>
                          <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => {
                              const newConditions = [...conditions];
                              newConditions[index].value = e.target.value;
                              setConditions(newConditions);
                            }}
                            placeholder="Value"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* DELETE Query Interface */}
          {queryType === 'DELETE' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Select Table for Delete</h3>
                <div className="grid grid-cols-2 gap-4">
                  {schemas?.map((schema) => (
                    <Button
                      key={schema.name}
                      variant={selectedTables.has(schema.name) ? 'default' : 'outline'}
                      onClick={() => setSelectedTables(new Set([schema.name]))}
                      className="p-4 h-auto flex-col"
                    >
                      <span className="font-medium">{schema.name}</span>
                      <span className="text-xs opacity-70">{schema.rowCount.toLocaleString()} rows</span>
                    </Button>
                  ))}
                </div>
              </div>

              {Array.from(selectedTables).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Where Conditions (Required)</h3>
                  <p className="text-sm text-yellow-600 mb-4">⚠️ Always add conditions to avoid deleting all data!</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const schema = schemas?.find(s => selectedTables.has(s.name));
                      if (schema) {
                        setConditions([...conditions, {
                          column: schema.columns[0].name,
                          operator: '=',
                          value: ''
                        }]);
                      }
                    }}
                    className="mb-3"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Condition
                  </Button>
                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <select
                          value={condition.column}
                          onChange={(e) => {
                            const newConditions = [...conditions];
                            newConditions[index].column = e.target.value;
                            setConditions(newConditions);
                          }}
                          className="w-1/4 px-3 py-2 border border-slate-300 rounded-md"
                        >
                          {schemas?.find(s => selectedTables.has(s.name))?.columns.map(col => (
                            <option key={col.name} value={col.name}>{col.name}</option>
                          ))}
                        </select>
                        <select
                          value={condition.operator}
                          onChange={(e) => {
                            const newConditions = [...conditions];
                            newConditions[index].operator = e.target.value as any;
                            setConditions(newConditions);
                          }}
                          className="w-1/6 px-3 py-2 border border-slate-300 rounded-md"
                        >
                          <option value="=">=</option>
                          <option value="!=">!=</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<=">&lt;=</option>
                          <option value="LIKE">LIKE</option>
                        </select>
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => {
                            const newConditions = [...conditions];
                            newConditions[index].value = e.target.value;
                            setConditions(newConditions);
                          }}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CREATE TABLE Query Interface */}
          {queryType === 'CREATE' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Table Name</h3>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Enter new table name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Define Columns</h3>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewColumns([...newColumns, {
                      name: '',
                      type: 'VARCHAR(255)',
                      nullable: true
                    }]);
                  }}
                  className="mb-3"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Column
                </Button>
                <div className="space-y-3">
                  {newColumns.map((column, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={column.name}
                        onChange={(e) => {
                          const newCols = [...newColumns];
                          newCols[index].name = e.target.value;
                          setNewColumns(newCols);
                        }}
                        placeholder="Column name"
                        className="w-1/4 px-3 py-2 border border-slate-300 rounded-md"
                      />
                      <select
                        value={column.type}
                        onChange={(e) => {
                          const newCols = [...newColumns];
                          newCols[index].type = e.target.value;
                          setNewColumns(newCols);
                        }}
                        className="w-1/4 px-3 py-2 border border-slate-300 rounded-md"
                      >
                        <option value="VARCHAR(255)">VARCHAR(255)</option>
                        <option value="TEXT">TEXT</option>
                        <option value="INTEGER">INTEGER</option>
                        <option value="NUMERIC">NUMERIC</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="TIMESTAMP">TIMESTAMP</option>
                        <option value="DATE">DATE</option>
                      </select>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={!column.nullable}
                          onChange={(e) => {
                            const newCols = [...newColumns];
                            newCols[index].nullable = !e.target.checked;
                            setNewColumns(newCols);
                          }}
                        />
                        <span className="text-sm">NOT NULL</span>
                      </label>
                      <input
                        type="text"
                        value={column.defaultValue || ''}
                        onChange={(e) => {
                          const newCols = [...newColumns];
                          newCols[index].defaultValue = e.target.value;
                          setNewColumns(newCols);
                        }}
                        placeholder="Default value (optional)"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
          <Button onClick={handleApply} disabled={!generateSQL()}>
            Apply to Editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
