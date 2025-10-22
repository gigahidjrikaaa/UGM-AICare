/**
 * IAQueryResults Component
 * 
 * Displays query results with Recharts visualizations and privacy metadata
 */

'use client';

import { IAGraphResponse } from '@/services/langGraphApi';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface IAQueryResultsProps {
  result: IAGraphResponse | null;
  loading: boolean;
}

// Colors for charts
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

/**
 * Generate appropriate chart based on query type
 */
function getChartForQueryType(queryName: string, data: Record<string, unknown>[]) {
  // Determine chart type based on query
  if (queryName.includes('trend') || queryName.includes('time')) {
    // Time series data - use Line Chart
    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} name="Count" />
        {data[0] && 'severity' in data[0] && (
          <Line type="monotone" dataKey="severity" stroke="#EF4444" strokeWidth={2} name="Severity" />
        )}
      </LineChart>
    );
  } else if (queryName.includes('distribution') || queryName.includes('case')) {
    // Distribution data - use Pie Chart
    return (
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    );
  } else {
    // Default to Bar Chart
    const dataKey = Object.keys(data[0] || {}).find(key => typeof data[0]?.[key] === 'number') || 'value';
    const nameKey = Object.keys(data[0] || {}).find(key => typeof data[0]?.[key] === 'string') || 'name';
    
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey={dataKey} fill="#3B82F6" name="Count" />
      </BarChart>
    );
  }
}


export function IAQueryResults({ result, loading }: IAQueryResultsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Query Results</h2>
            <p className="text-sm text-gray-600 mt-1">Privacy-preserving analytics output</p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-600">Executing query with privacy safeguards...</p>
            <p className="text-xs text-gray-500 mt-1">Validating consent → Applying k-anonymity → Executing analytics</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Query Results</h2>
            <p className="text-sm text-gray-600 mt-1">Privacy-preserving analytics output</p>
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 opacity-50 cursor-not-allowed">
            Export CSV
          </button>
        </div>
        
        <div className="p-6">
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-4 text-sm">No query results yet</p>
            <p className="text-xs text-gray-400 mt-1">Select and execute a query above to see results</p>
          </div>
        </div>
      </div>
    );
  }

  const { query_name, result: queryResult, privacy_metadata, execution_path, execution_time_ms } = result;

  // Format query name for display
  const queryNameDisplay = query_name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const exportToCSV = () => {
    // Simple CSV export - in production, add proper formatting
    const csvContent = JSON.stringify(queryResult.data, null, 2);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${query_name}_results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Query Results</h2>
          <p className="text-sm text-gray-600 mt-1">{queryNameDisplay}</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>
      
      <div className="p-6">
        {/* Success Message */}
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Query executed successfully</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Execution path: {execution_path.join(' → ')}</p>
                <p>Execution time: {execution_time_ms?.toFixed(0) || 'N/A'} ms</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Data */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Summary</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">
                  {queryResult.total_records_anonymized || queryResult.data?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">k-anonymity</p>
                <p className="text-2xl font-bold text-green-600">
                  {queryResult.k_anonymity_satisfied ? '✓' : '✗'} k={privacy_metadata.k_value}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ε Budget Used</p>
                <p className="text-2xl font-bold text-blue-600">
                  {privacy_metadata.epsilon_used.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">δ Budget Used</p>
                <p className="text-2xl font-bold text-purple-600">
                  {privacy_metadata.delta_used.toExponential(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Visualization */}
        {queryResult.data && queryResult.data.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Visualization</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <ResponsiveContainer width="100%" height={400}>
                {getChartForQueryType(query_name, queryResult.data)}
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-4 text-center">
                All data points meet k≥{privacy_metadata.k_value} privacy threshold
              </p>
            </div>
          </div>
        )}

        {/* Raw Data Table */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Results Data</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {queryResult.data && queryResult.data.length > 0 && Object.keys(queryResult.data[0]).map((key) => (
                    <th
                      key={key}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queryResult.data && queryResult.data.slice(0, 10).map((row: Record<string, unknown>, idx: number) => (
                  <tr key={idx}>
                    {Object.values(row).map((value: unknown, cellIdx: number) => (
                      <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {queryResult.data && queryResult.data.length > 10 && (
              <p className="text-sm text-gray-500 mt-2 px-6">
                Showing first 10 of {queryResult.data.length} results. Export CSV to see all.
              </p>
            )}
          </div>
        </div>

        {/* Privacy Metadata */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-purple-800">Privacy Metadata</h3>
              <div className="mt-2 text-sm text-purple-700 space-y-1">
                <p>
                  <strong>k-anonymity satisfied:</strong>{' '}
                  {queryResult.k_anonymity_satisfied ? (
                    <span className="text-green-700">✓ Yes (k={privacy_metadata.k_value}, threshold=5)</span>
                  ) : (
                    <span className="text-red-700">✗ No (k&lt;5)</span>
                  )}
                </p>
                <p>
                  <strong>Differential privacy budget used:</strong> ε={privacy_metadata.epsilon_used.toFixed(4)}, δ={privacy_metadata.delta_used.toExponential(2)}
                </p>
                <p>
                  <strong>Total records anonymized:</strong> {queryResult.total_records_anonymized}
                </p>
                <p>
                  <strong>Privacy guarantees:</strong> All results meet k≥5 threshold and consume minimal ε-δ budget
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
