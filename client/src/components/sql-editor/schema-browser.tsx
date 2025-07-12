import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Table, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { TableSchema } from "@shared/schema";

export function SchemaBrowser() {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['water_meter_readings']));

  const { data: schemas, isLoading, refetch } = useQuery<TableSchema[]>({
    queryKey: ['/api/schema'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const formatRowCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M rows`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K rows`;
    }
    return `${count} rows`;
  };

  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('varchar') || lowerType.includes('text')) {
      return 'text-purple-500';
    } else if (lowerType.includes('int') || lowerType.includes('serial')) {
      return 'text-blue-500';
    } else if (lowerType.includes('decimal') || lowerType.includes('numeric')) {
      return 'text-green-500';
    } else if (lowerType.includes('timestamp') || lowerType.includes('date')) {
      return 'text-orange-500';
    } else if (lowerType.includes('boolean')) {
      return 'text-pink-500';
    }
    return 'text-slate-500';
  };

  return (
    <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Database Schema</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">PostgreSQL Connected</span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">utility_analytics_db</p>
        </div>
      </div>

      {/* Schema Tables */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <div className="ml-6 space-y-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-6 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {schemas?.map((schema) => (
              <div key={schema.name} className="schema-table">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto text-left"
                  onClick={() => toggleTable(schema.name)}
                >
                  <div className="flex items-center space-x-2">
                    {expandedTables.has(schema.name) ? (
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                    )}
                    <Table className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{schema.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {formatRowCount(schema.rowCount)}
                  </Badge>
                </Button>
                
                {expandedTables.has(schema.name) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {schema.columns.map((column) => (
                      <div key={column.name} className="flex items-center justify-between py-1 px-2 text-xs">
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-600 dark:text-slate-400">{column.name}</span>
                          {column.isPrimaryKey && (
                            <Badge variant="outline" className="text-xs h-4 px-1">PK</Badge>
                          )}
                          {!column.nullable && (
                            <span className="text-red-500 text-xs">*</span>
                          )}
                        </div>
                        <span className={`font-mono text-xs ${getTypeColor(column.type)}`}>
                          {column.type.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Queries Section */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Saved Queries</h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Database className="h-3 w-3" />
          </Button>
        </div>
        <SavedQueriesList />
      </div>
    </div>
  );
}

function SavedQueriesList() {
  const { data: savedQueries, isLoading } = useQuery({
    queryKey: ['/api/queries/saved'],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {savedQueries?.map((query, index) => (
        <Button
          key={query.id}
          variant="ghost"
          className="w-full justify-start p-2 h-auto text-left"
        >
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              index % 3 === 0 ? 'bg-blue-500' : 
              index % 3 === 1 ? 'bg-green-500' : 'bg-purple-500'
            }`} />
            <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
              {query.name}
            </span>
          </div>
        </Button>
      ))}
    </div>
  );
}
