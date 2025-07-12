import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Table, BarChart3, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueryResult } from "@shared/schema";

interface ResultsTableProps {
  result: QueryResult | null;
  isLoading: boolean;
  onExport: (format: string) => void;
}

export function ResultsTable({ result, isLoading, onExport }: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'table' | 'charts' | 'dashboard'>('table');
  const rowsPerPage = 20;

  if (isLoading) {
    return (
      <div className="flex-1 bg-white dark:bg-slate-800 flex flex-col">
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 bg-white dark:bg-slate-800 flex flex-col">
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <Button
                variant={activeTab === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('table')}
                className="px-3 py-1"
              >
                <Table className="w-4 h-4 mr-1" />
                Table
              </Button>
              <Button
                variant={activeTab === 'charts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('charts')}
                className="px-3 py-1"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Charts
              </Button>
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('dashboard')}
                className="px-3 py-1"
              >
                <LayoutDashboard className="w-4 h-4 mr-1" />
                LayoutDashboard
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Table className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No Query Results
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Execute a SQL query to see results here
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(result.rows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, result.rows.length);
  const currentRows = result.rows.slice(startIndex, endIndex);

  return (
    <div className="flex-1 bg-white dark:bg-slate-800 flex flex-col">
      {/* Results Toolbar */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <Button
              variant={activeTab === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('table')}
              className="px-3 py-1"
            >
              <Table className="w-4 h-4 mr-1" />
              Table
            </Button>
            <Button
              variant={activeTab === 'charts' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('charts')}
              className="px-3 py-1"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Charts
            </Button>
            <Button
              variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('dashboard')}
              className="px-3 py-1"
            >
              <LayoutDashboard className="w-4 h-4 mr-1" />
              LayoutDashboard
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('csv')}
            className="bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
          >
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('json')}
            className="bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800"
          >
            <Download className="w-4 h-4 mr-1" />
            JSON
          </Button>
        </div>
      </div>

      {/* Results Content */}
      {activeTab === 'table' && (
        <>
          {/* Results Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                <tr>
                  {result.columns.map((column, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-600 last:border-r-0"
                    >
                      {column}
                      <i className="fas fa-sort ml-1 text-slate-400"></i>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {currentRows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-600 last:border-r-0"
                      >
                        {cell === null || cell === undefined ? (
                          <span className="text-slate-400 italic">null</span>
                        ) : typeof cell === 'number' ? (
                          <span className="font-mono">{cell.toLocaleString()}</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Results Pagination */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
              <span>
                Showing {startIndex + 1}-{endIndex} of {result.rowCount} results
              </span>
              <Badge variant="secondary" className="text-xs">
                {result.executionTime}ms
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2 text-slate-400">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'charts' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Chart Visualization
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Chart visualization will be implemented here
            </p>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LayoutDashboard className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              LayoutDashboard Builder
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Drag-and-drop dashboard builder will be implemented here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
