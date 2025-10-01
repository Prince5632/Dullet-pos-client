import * as XLSX from 'xlsx';
import type { User } from '../types';

export interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
}

/**
 * Export users data to Excel file
 * @param users - Array of user objects to export
 * @param options - Export options (filename, sheet name)
 */
export const exportUsersToExcel = (users: User[], options: ExcelExportOptions = {}) => {
  const {
    filename = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`,
    sheetName = 'Users'
  } = options;

  // Map users data to match the displayed columns
  const exportData = users.map((user, index) => ({
    'S.No': index + 1,
    'Employee ID': user.employeeId || '',
    'First Name': user.firstName || '',
    'Last Name': user.lastName || '',
    'Full Name': `${user.firstName} ${user.lastName}`.trim(),
    'Email': user.email || '',
    'Phone': user.phone || '',
    'Department': user.department || '',
    'Position': user.position || '',
    'Role': user.role?.name || 'No Role',
    'Status': user.isActive ? 'Active' : 'Inactive',
    'Primary Godown': user.primaryGodown?.name || '',
    'Accessible Godowns': user.accessibleGodowns?.map(g => g.name).join(', ') || '',
    'Created Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
    'Updated Date': user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : '',
    'Created By': user.createdBy?.firstName && user.createdBy?.lastName 
      ? `${user.createdBy.firstName} ${user.createdBy.lastName}` 
      : user.createdBy?.email || '',
    'Updated By': user.updatedBy?.firstName && user.updatedBy?.lastName 
      ? `${user.updatedBy.firstName} ${user.updatedBy.lastName}` 
      : user.updatedBy?.email || ''
  }));

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 8 },   // S.No
    { wch: 12 },  // Employee ID
    { wch: 15 },  // First Name
    { wch: 15 },  // Last Name
    { wch: 20 },  // Full Name
    { wch: 25 },  // Email
    { wch: 15 },  // Phone
    { wch: 15 },  // Department
    { wch: 15 },  // Position
    { wch: 15 },  // Role
    { wch: 10 },  // Status
    { wch: 20 },  // Primary Godown
    { wch: 30 },  // Accessible Godowns
    { wch: 12 },  // Created Date
    { wch: 12 },  // Updated Date
    { wch: 20 },  // Created By
    { wch: 20 }   // Updated By
  ];

  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate and download the file
  XLSX.writeFile(workbook, filename);
};

/**
 * Export filtered users data to Excel
 * @param users - Array of user objects to export
 * @param filters - Current filter values to include in filename
 * @param options - Export options
 */
export const exportFilteredUsersToExcel = (
  users: User[], 
  filters: Record<string, any> = {}, 
  options: ExcelExportOptions = {}
) => {
  // Create a descriptive filename based on filters
  const filterParts = [];
  if (filters.search) filterParts.push(`search-${filters.search}`);
  if (filters.department) filterParts.push(`dept-${filters.department}`);
  if (filters.role) filterParts.push(`role-${filters.role}`);
  if (filters.status) filterParts.push(`status-${filters.status}`);

  const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : '';
  const defaultFilename = `users_export${filterSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;

  exportUsersToExcel(users, {
    ...options,
    filename: options.filename || defaultFilename
  });
};