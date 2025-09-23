import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils';
import type { TableColumn } from '../../types';

interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  className?: string;
}

const Table = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  sortBy,
  sortDirection,
  onSort,
  className,
}: TableProps<T>) => {
  const handleSort = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key as string);
    }
  };

  const renderCellValue = (item: T, column: TableColumn<T>) => {
    if (column.render) {
      return column.render(item[column.key as keyof T], item);
    }
    
    const value = item[column.key as keyof T];
    if (value === null || value === undefined) {
      return '-';
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100 transition-colors duration-200'
                  )}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUpIcon
                          className={cn(
                            'h-3 w-3',
                            sortBy === column.key && sortDirection === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          )}
                        />
                        <ChevronDownIcon
                          className={cn(
                            'h-3 w-3 -mt-1',
                            sortBy === column.key && sortDirection === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50 transition-colors duration-200">
                {columns.map((column) => (
                  <td
                    key={column.key as string}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {renderCellValue(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
