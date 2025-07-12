import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Download, Table, BarChart3, LayoutDashboard, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, PieChart, Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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

  // Process data for charts
  const chartData = useMemo(() => {
    if (!result || result.rows.length === 0) return [];
    
    return result.rows.slice(0, 50).map((row, index) => {
      const dataPoint: any = { index };
      result.columns.forEach((column, colIndex) => {
        dataPoint[column] = row[colIndex];
      });
      return dataPoint;
    });
  }, [result]);

  // Identify numeric columns for charts
  const numericColumns = useMemo(() => {
    if (!result || result.rows.length === 0) return [];
    
    const numeric: string[] = [];
    result.columns.forEach((column, colIndex) => {
      const sampleValue = result.rows[0]?.[colIndex];
      if (typeof sampleValue === 'number' || (!isNaN(Number(sampleValue)) && sampleValue !== null)) {
        numeric.push(column);
      }
    });
    return numeric;
  }, [result]);

  // Calculate basic statistics
  const statistics = useMemo(() => {
    if (!result || result.rows.length === 0) return {};
    
    const stats: any = {};
    numericColumns.forEach(column => {
      const columnIndex = result.columns.indexOf(column);
      const values = result.rows
        .map(row => Number(row[columnIndex]))
        .filter(val => !isNaN(val) && val !== null);
      
      if (values.length > 0) {
        stats[column] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          total: values.reduce((a, b) => a + b, 0),
          count: values.length
        };
      }
    });
    return stats;
  }, [result, numericColumns]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

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

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="flex-1 p-6 overflow-auto">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No Chart Data Available
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Execute a query with numeric data to generate charts
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Bar Chart */}
              {numericColumns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Bar Chart</CardTitle>
                    <CardDescription>Visual representation of your data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.slice(0, 20)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey={result.columns[0]} 
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {numericColumns.slice(0, 3).map((column, index) => (
                          <Bar key={column} dataKey={column} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Line Chart */}
              {numericColumns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Line Chart</CardTitle>
                    <CardDescription>Trend analysis of your data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData.slice(0, 20)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey={result.columns[0]}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {numericColumns.slice(0, 3).map((column, index) => (
                          <Line 
                            key={column} 
                            type="monotone" 
                            dataKey={column} 
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Pie Chart for first numeric column */}
              {numericColumns.length > 0 && chartData.length <= 10 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Distribution Chart</CardTitle>
                    <CardDescription>Proportion breakdown of {numericColumns[0]}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData.slice(0, 8)}
                          dataKey={numericColumns[0]}
                          nameKey={result.columns[0]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {chartData.slice(0, 8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
                  <Table className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.rowCount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Query execution time: {result.executionTime}ms
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Columns</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.columns.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {numericColumns.length} numeric columns
                  </p>
                </CardContent>
              </Card>

              {numericColumns.length > 0 && Object.keys(statistics).length > 0 && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Value</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Object.values(statistics)[0]?.avg?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Object.keys(statistics)[0]}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Max Value</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Object.values(statistics)[0]?.max?.toLocaleString() || 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Object.keys(statistics)[0]}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Detailed Statistics */}
            {Object.keys(statistics).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Column Statistics</CardTitle>
                  <CardDescription>Statistical summary for numeric columns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statistics).map(([column, stats]: [string, any]) => (
                      <div key={column} className="border rounded-lg p-4">
                        <h4 className="font-semibold text-lg mb-3">{column}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Count</p>
                            <p className="text-lg font-semibold">{stats.count?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Min</p>
                            <p className="text-lg font-semibold">{stats.min?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Max</p>
                            <p className="text-lg font-semibold">{stats.max?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Average</p>
                            <p className="text-lg font-semibold">{stats.avg?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-lg font-semibold">{stats.total?.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mini Chart Dashboard */}
            {numericColumns.length > 0 && chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Visualization</CardTitle>
                  <CardDescription>Overview chart of your data</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey={result.columns[0]}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey={numericColumns[0]} fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
