import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Database, 
  Play, 
  Save, 
  Download, 
  Plus, 
  Moon, 
  Sun, 
  Wand2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import { SchemaBrowser } from "@/components/sql-editor/schema-browser";
import { MonacoEditor } from "@/components/sql-editor/monaco-editor";
import { ResultsTable } from "@/components/sql-editor/results-table";
import { QueryBuilderModal } from "@/components/sql-editor/query-builder-modal";
import { FloatingActions } from "@/components/sql-editor/floating-actions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { QueryResult } from "@shared/schema";

const DEFAULT_QUERY = `SELECT
    meter_id,
    location_zone,
    SUM(usage_gallons) AS total_usage,
    AVG(usage_gallons) AS avg_usage,
    COUNT(*) AS reading_count
FROM water_meter_readings
WHERE reading_date >= '2024-01-01'
GROUP BY meter_id, location_zone
ORDER BY total_usage DESC`;

export default function SqlGenerator() {
  const [sqlQuery, setSqlQuery] = useState(DEFAULT_QUERY);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isQueryBuilderOpen, setIsQueryBuilderOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Execute query mutation
  const executeQueryMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('POST', '/api/queries/execute', { sqlQuery: query });
      return response.json();
    },
    onSuccess: (result: QueryResult) => {
      setQueryResult(result);
      toast({
        title: "Query executed successfully",
        description: `Retrieved ${result.rowCount} rows in ${result.executionTime}ms`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Query execution failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save query mutation
  const saveQueryMutation = useMutation({
    mutationFn: async (queryData: { name: string; description?: string; sqlQuery: string }) => {
      const response = await apiRequest('POST', '/api/queries/saved', queryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queries/saved'] });
      toast({
        title: "Query saved successfully",
        description: "Your query has been saved to the library",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save query",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export query results
  const exportMutation = useMutation({
    mutationFn: async ({ format }: { format: string }) => {
      const response = await apiRequest('POST', '/api/queries/export', { 
        sqlQuery, 
        format 
      });
      return { response, format };
    },
    onSuccess: async ({ response, format }) => {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `query_results.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export completed",
        description: `Results exported as ${format.toUpperCase()}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRunQuery = () => {
    if (!sqlQuery.trim()) {
      toast({
        title: "No query to execute",
        description: "Please enter a SQL query",
        variant: "destructive",
      });
      return;
    }
    executeQueryMutation.mutate(sqlQuery);
  };

  const handleSaveQuery = () => {
    if (!sqlQuery.trim()) {
      toast({
        title: "No query to save",
        description: "Please enter a SQL query",
        variant: "destructive",
      });
      return;
    }

    // For now, generate a simple name. In a real app, you'd want a dialog to get user input
    const queryName = `Query ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
    saveQueryMutation.mutate({
      name: queryName,
      description: "User generated query",
      sqlQuery,
    });
  };

  const handleExport = (format: string) => {
    if (!queryResult || queryResult.rows.length === 0) {
      toast({
        title: "No data to export",
        description: "Execute a query first to get results",
        variant: "destructive",
      });
      return;
    }
    exportMutation.mutate({ format });
  };

  const handleNewQuery = () => {
    setSqlQuery('');
    setQueryResult(null);
  };

  const handleQueryBuilderApply = (generatedQuery: string) => {
    setSqlQuery(generatedQuery);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRunQuery();
      } else if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSaveQuery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sqlQuery]);

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-14 flex items-center px-4 justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Database className="text-blue-500 h-5 w-5" />
            <h1 className="text-lg font-semibold">SQL Report Generator</h1>
          </div>
          <div className="hidden md:flex items-center space-x-2 ml-8">
            <Button
              onClick={handleRunQuery}
              disabled={executeQueryMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Play className="w-4 h-4 mr-1" />
              Run Query
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveQuery}
              disabled={saveQueryMutation.isPending}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={!queryResult || exportMutation.isPending}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={handleNewQuery}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Query
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setIsQueryBuilderOpen(true)}
            className="bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300"
          >
            <Wand2 className="w-4 h-4 mr-1" />
            Query Builder
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </Button>
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar */}
        <SchemaBrowser />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* SQL Editor Section */}
          <div className="h-2/5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Editor Toolbar */}
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Query Editor</span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
                  Valid Syntax
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  Optimize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Format
                </Button>
              </div>
            </div>

            {/* SQL Editor */}
            <div className="flex-1">
              <MonacoEditor
                value={sqlQuery}
                onChange={setSqlQuery}
                language="sql"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  folding: true,
                  wordWrap: 'on',
                }}
              />
            </div>

            {/* Query Status Bar */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-4">
                {queryResult && (
                  <>
                    <span className="text-slate-600 dark:text-slate-400">
                      Execution: {queryResult.executionTime}ms
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {queryResult.rowCount} rows
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      Query completed
                    </span>
                  </>
                )}
                {executeQueryMutation.isPending && (
                  <span className="text-blue-600 dark:text-blue-400">
                    Executing query...
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-slate-600 dark:text-slate-400">PostgreSQL 14.2</span>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <ResultsTable
            result={queryResult}
            isLoading={executeQueryMutation.isPending}
            onExport={handleExport}
          />
        </div>
      </div>

      {/* Query Builder Modal */}
      <QueryBuilderModal
        isOpen={isQueryBuilderOpen}
        onClose={() => setIsQueryBuilderOpen(false)}
        onApply={handleQueryBuilderApply}
      />

      {/* Floating Action Buttons */}
      <FloatingActions
        onRunQuery={handleRunQuery}
        onSaveQuery={handleSaveQuery}
        onCreateDashboard={() => {
          toast({
            title: "Dashboard Builder",
            description: "Dashboard creation feature coming soon!",
          });
        }}
        isQueryRunning={executeQueryMutation.isPending}
      />
    </div>
  );
}
