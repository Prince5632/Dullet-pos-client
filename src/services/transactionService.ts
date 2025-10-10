import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type { ApiResponse, PaginationResponse, Transaction, TransactionListParams } from '../types';

class TransactionService {
  // Get all transactions with pagination and filtering
  async getTransactions(params: TransactionListParams = {}): Promise<PaginationResponse<{ transactions: Transaction[] }>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const url = `${API_CONFIG.ENDPOINTS.TRANSACTIONS}?${queryParams.toString()}`;
    return await apiService.get<{ transactions: Transaction[] }>(url) as PaginationResponse<{ transactions: Transaction[] }>;
  }

  // Get transaction by ID
  async getTransactionById(id: string): Promise<Transaction> {
    const response = await apiService.get<{ transaction: Transaction }>(API_CONFIG.ENDPOINTS.TRANSACTION_BY_ID(id));
    if (response.success && response.data) {
      return response.data.transaction;
    }
    throw new Error(response.message || 'Failed to get transaction');
  }

  // Get customer transactions
  async getCustomerTransactions(customerId: string, params: Omit<TransactionListParams, 'customerId'> = {}): Promise<PaginationResponse<{ transactions: Transaction[] }>> {
    return this.getTransactions({ ...params, customerId });
  }

  // Create new transaction
  async createTransaction(transactionData: {
    transactionMode: string;
    transactionForModel: string;
    transactionFor: string;
    amountPaid: number;
    customer: string;
    notes?: string;
  }): Promise<Transaction> {
    const response = await apiService.post<{ transaction: Transaction }>(API_CONFIG.ENDPOINTS.TRANSACTIONS, transactionData);
    if (response.success && response.data) {
      return response.data.transaction;
    }
    throw new Error(response.message || 'Failed to create transaction');
  }

  // Utility methods
  getTransactionModes(): Array<{ label: string; value: string }> {
    return [
      { label: 'All Modes', value: '' },
      { label: 'Cash', value: 'Cash' },
      { label: 'Credit', value: 'Credit' },
      { label: 'Cheque', value: 'Cheque' },
      { label: 'Online', value: 'Online' },
    ];
  }

  getTransactionModels(): Array<{ label: string; value: string }> {
    return [
      { label: 'All Types', value: '' },
      { label: 'Order Payment', value: 'Order' },
      { label: 'Customer Payment', value: 'Customer' },
    ];
  }

  formatTransactionDisplay(transaction: Transaction): string {
    return `${transaction.transactionId} - ${transaction.transactionMode}`;
  }

  getTransactionModeColor(mode: string): string {
    const modeColors: Record<string, string> = {
      Cash: 'bg-green-100 text-green-800',
      Credit: 'bg-blue-100 text-blue-800',
      Cheque: 'bg-yellow-100 text-yellow-800',
      Online: 'bg-purple-100 text-purple-800',
    };
    return modeColors[mode] || 'bg-gray-100 text-gray-800';
  }
}

export const transactionService = new TransactionService();
export default transactionService;