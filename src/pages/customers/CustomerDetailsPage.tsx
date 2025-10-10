import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { customerService } from "../../services/customerService";
import { transactionService } from "../../services/transactionService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import { formatCurrency, formatDate, cn } from "../../utils";
import type { Customer, Transaction } from "../../types";

const CustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsPagination, setTransactionsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const fetchCustomer = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await customerService.getCustomerById(id);
      setCustomer(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (page: number = 1) => {
    if (!id) return;
    try {
      setTransactionsLoading(true);
      const response = await transactionService.getCustomerTransactions(id, {
        page,
        limit: transactionsPagination.itemsPerPage,
      });

      if (response.success && response.data) {
        setTransactions(response.data.transactions);
        setTransactionsPagination({
          currentPage: response.data.pagination.currentPage,
          totalPages: response.data.pagination.totalPages,
          totalItems: response.data.pagination.totalItems,
          itemsPerPage: response.data.pagination.itemsPerPage,
        });
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
    fetchTransactions();
  }, [id]);

  const handlePageChange = (page: number) => {
    fetchTransactions(page);
  };

  const getTransactionModeColor = (mode: string) => {
    switch (mode.toLowerCase()) {
      case "cash":
        return "success";
      case "credit":
        return "warning";
      case "cheque":
        return "info";
      case "online":
        return "primary";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Customer not found
          </h3>
          <p className="text-gray-500">
            The customer you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/customers"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white  rounded-lg  border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to="/customers"
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-1" />
                  Back to Customers
                </Link>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  to={`/customers/${customer._id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Customer
                </Link>
              </div>
            </div>

            {/* Customer Header Info */}
            <div className="mt-6 flex items-center space-x-6">
              <Avatar name={customer.businessName} size="lg" />
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {customer.businessName}
                  </h1>
                  <Badge
                    variant={customer.isActive ? "success" : "error"}
                    size="sm"
                  >
                    {customer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Customer ID: {customer.customerId}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center">
                      <span>•</span>
                      <span className="ml-1">{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <span>•</span>
                    <span className="ml-1">{customer.customerType}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto  py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Contact Information
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Business Name
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.businessName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Phone
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.phone}
                    </p>
                  </div>
                  {customer.alternatePhone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Alternate Phone
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.alternatePhone}
                      </p>
                    </div>
                  )}
                  {customer.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.email}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Customer Type
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.customerType}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Address Information
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Street Address
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.address?.street || "Not provided"}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        City
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.address?.city || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        State
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.address?.state || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Pincode
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customer.address?.pincode || "Not provided"}
                      </p>
                    </div>
                  </div>
                  {customer.location && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Location
                      </label>
                      <a
                        href={customer.location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Transaction History
                </h3>
              </div>
              <div className="overflow-hidden">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      No transactions found
                    </h3>
                    <p className="text-sm text-gray-500">
                      This customer hasn't made any transactions yet.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Transaction ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mode
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Order
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created By
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactions.map((transaction) => (
                            <tr
                              key={transaction._id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {transaction.transactionId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(transaction.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant={getTransactionModeColor(
                                    transaction.transactionMode
                                  )}
                                  size="sm"
                                >
                                  {transaction.transactionMode}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(transaction.amountPaid)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transaction?.transactionFor ? (
                                  <Link
                                    to={`/orders/${transaction?.transactionFor?._id}`}
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {transaction?.transactionFor?.orderNumber}
                                  </Link>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transaction.createdBy.firstName}{" "}
                                {transaction.createdBy.lastName}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {transactionsPagination.totalPages > 1 && (
                      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <button
                            onClick={() =>
                              handlePageChange(
                                transactionsPagination.currentPage - 1
                              )
                            }
                            disabled={transactionsPagination.currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              handlePageChange(
                                transactionsPagination.currentPage + 1
                              )
                            }
                            disabled={
                              transactionsPagination.currentPage ===
                              transactionsPagination.totalPages
                            }
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing{" "}
                              <span className="font-medium">
                                {(transactionsPagination.currentPage - 1) *
                                  transactionsPagination.itemsPerPage +
                                  1}
                              </span>{" "}
                              to{" "}
                              <span className="font-medium">
                                {Math.min(
                                  transactionsPagination.currentPage *
                                    transactionsPagination.itemsPerPage,
                                  transactionsPagination.totalItems
                                )}
                              </span>{" "}
                              of{" "}
                              <span className="font-medium">
                                {transactionsPagination.totalItems}
                              </span>{" "}
                              results
                            </p>
                          </div>
                          <div>
                            <nav
                              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                              aria-label="Pagination"
                            >
                              <button
                                onClick={() =>
                                  handlePageChange(
                                    transactionsPagination.currentPage - 1
                                  )
                                }
                                disabled={
                                  transactionsPagination.currentPage === 1
                                }
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ChevronLeftIcon className="h-5 w-5" />
                              </button>
                              {Array.from(
                                { length: transactionsPagination.totalPages },
                                (_, i) => i + 1
                              ).map((page) => (
                                <button
                                  key={page}
                                  onClick={() => handlePageChange(page)}
                                  className={cn(
                                    "relative inline-flex items-center px-4 py-2 border text-sm font-medium",
                                    page === transactionsPagination.currentPage
                                      ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                      : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                  )}
                                >
                                  {page}
                                </button>
                              ))}
                              <button
                                onClick={() =>
                                  handlePageChange(
                                    transactionsPagination.currentPage + 1
                                  )
                                }
                                disabled={
                                  transactionsPagination.currentPage ===
                                  transactionsPagination.totalPages
                                }
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ChevronRightIcon className="h-5 w-5" />
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <CurrencyRupeeIcon className="h-5 w-5 mr-2" />
                  Financial Summary
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">
                    Outstanding Amount
                  </span>
                  <span className="text-lg font-semibold text-red-600">
                    {formatCurrency(customer.outstandingAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">
                    Total Orders
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {customer.totalOrders}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">
                    Total Order Value
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(customer.totalOrderValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                  Additional Information
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {customer.gstNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      GST Number
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.gstNumber}
                    </p>
                  </div>
                )}
                {customer.panNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      PAN Number
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.panNumber}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Created Date
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(customer.createdAt)}
                  </p>
                </div>
                {customer.lastOrderDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Last Order Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(customer.lastOrderDate)}
                    </p>
                  </div>
                )}
                {customer.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Notes
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {customer.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsPage;
