import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, UserIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { customerService } from '../../services/customerService';
import type { Customer, CreateCustomerForm, Godown } from '../../types';
import Select from 'react-select';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { toast } from 'react-hot-toast';
import Modal from '../ui/Modal'; // Import your improved Modal component

interface CustomerSelectorProps {
  selectedCustomerId?: string;
  onCustomerChange: (customerId: string, customer: Customer | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showDetails?: boolean;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomerId,
  onCustomerChange,
  label = 'Customer',
  placeholder = 'Search and select customer',
  disabled = false,
  required = false,
  error,
  showDetails = true,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateCustomerForm>({
    businessName: '',
    phone: '',
    location: '',
    address: {
      street: '',
      city: '',
      state: 'Punjab',
      pincode: '',
    },
    customerType: 'Retailer',
    assignedGodownId: '',

  });
  const [createLoading, setCreateLoading] = useState(false);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [godownsLoading, setGodownsLoading] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load customers on mount
  useEffect(() => {
    loadCustomers();
    // Load godowns for assignment in create modal
    (async () => {
      try {
        setGodownsLoading(true);
        const res = await apiService.get<{ godowns: Godown[] }>(API_CONFIG.ENDPOINTS.GODOWNS);
        if (res.success && res.data) setGodowns(res.data.godowns);
      } catch (err) {
        console.error('Failed to load godowns:', err);
      } finally {
        setGodownsLoading(false);
      }
    })();
  }, []);

  // Handle selected customer ID change
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const customer = customers.find(c => c._id === selectedCustomerId);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, customers]);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.includes(searchTerm)) ||
        (customer.location && customer.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const customerList = await customerService.getAllCustomers();
      setCustomers(customerList);
      setFilteredCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    onCustomerChange(customer._id, customer);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleDropdownToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(null);
    onCustomerChange('', null);
  };

  const handleCreateCustomer = async () => {
    try {
      setCreateLoading(true);
      
      // Basic validation
      if (!createFormData.businessName.trim() || !createFormData.phone.trim()) {
        toast.error('Please fill in all required fields');
        return;
      }

      const newCustomer = await customerService.createCustomer(createFormData);
      
      // Add to customers list and select it
      const updatedCustomers = [newCustomer, ...customers];
      setCustomers(updatedCustomers);
      setFilteredCustomers(updatedCustomers);
      
      // Select the new customer
      setSelectedCustomer(newCustomer);
      onCustomerChange(newCustomer._id, newCustomer);
      
      // Reset form and close
      setCreateFormData({
        businessName: '',
        phone: '',
        location: '',
        address: {
          street: '',
          city: '',
          state: 'Punjab',
          pincode: '',
        },
        customerType: 'Retailer',
      });
      setShowCreateModal(false);
      setIsOpen(false);
      
      toast.success('Customer created successfully!');
    } catch (error) {
      console.error('Failed to create customer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create customer');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateFormChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setCreateFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value,
        },
      }));
    } else {
      setCreateFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    // Reset form
    setCreateFormData({
      businessName: '',
      phone: '',
      location: '',
      address: {
        street: '',
        city: '',
        state: 'Punjab',
        pincode: '',
      },
      customerType: 'Retailer',
    });
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <div
          className={`
            relative w-full cursor-pointer rounded-md border px-3 py-2 text-left shadow-sm
            ${disabled 
              ? 'bg-gray-100 cursor-not-allowed'
              : 'bg-white hover:border-gray-400'
            }
            ${error 
              ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500'
              : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500'
            }
            focus-within:outline-none focus-within:ring-1 transition-colors
          `}
          onClick={handleDropdownToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              {selectedCustomer ? (
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {selectedCustomer.businessName}
                  </div>
                  {showDetails && (
                    <div className="text-xs text-gray-500 truncate">
                      {selectedCustomer.customerId} • {selectedCustomer.location ? 'Location available' : selectedCustomer.phone}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500 truncate">{placeholder}</span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {selectedCustomer && !disabled && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <ChevronDownIcon 
                className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              />
            </div>
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-80 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
            {/* Search Input */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Create New Customer Button */}
            <div className="sticky top-12 bg-white border-b border-gray-200 px-3 py-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create New Customer
              </button>
            </div>

            {/* Customer List */}
            {loading ? (
              <div className="px-3 py-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="px-3 py-8 text-center text-gray-500">
                <UserIcon className="h-8 w-8 mx-auto text-gray-300" />
                <p className="mt-2 text-sm">
                  {searchTerm ? 'No customers found matching your search' : 'No customers available'}
                </p>
                {!searchTerm && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Create your first customer
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer._id}
                    className={`
                      px-3 py-3 cursor-pointer hover:bg-gray-50 border-l-4 border-transparent
                      ${selectedCustomer?._id === customer._id ? 'bg-blue-50 border-l-blue-500' : ''}
                      ${!customer.isActive ? 'opacity-60' : ''}
                    `}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 truncate">
                            {customer.businessName}
                          </p>
                          {!customer.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {customer.customerId} • {customer.location ? 'Location available' : customer.phone}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {customer.phone} • {customer.customerType}
                        </p>
                        {showDetails && customer.address && (
                          <p className="text-xs text-gray-400 truncate">
                            {customer.address.city}, {customer.address.state}
                          </p>
                        )}
                      </div>
                      
                      {customer.creditLimit > 0 && (
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xs text-gray-500">
                            Credit: ₹{customer.creditLimit.toLocaleString()}
                          </p>
                          {customer.outstandingAmount > 0 && (
                            <p className="text-xs text-orange-600">
                              Outstanding: ₹{customer.outstandingAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Create Customer Modal - Using improved Modal component */}
      <Modal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        title="Create New Customer"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createFormData.businessName}
              onChange={(e) => handleCreateFormChange('businessName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Maps Link
            </label>
            <input
              type="url"
              value={createFormData.location || ''}
              onChange={(e) => handleCreateFormChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Paste Google Maps share link"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={createFormData.phone}
              onChange={(e) => handleCreateFormChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createFormData.address.street}
              onChange={(e) => handleCreateFormChange('address.street', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter street address"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createFormData.address.city}
                onChange={(e) => handleCreateFormChange('address.city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createFormData.address.pincode}
                onChange={(e) => handleCreateFormChange('address.pincode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter pincode"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Type
            </label>
            <select
              value={createFormData.customerType}
              onChange={(e) => handleCreateFormChange('customerType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Retailer">Retailer</option>
              <option value="Distributor">Distributor</option>
              <option value="Wholesaler">Wholesaler</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Godown
            </label>
            <Select
              isLoading={godownsLoading}
              options={godowns.map(g => ({ value: g._id, label: `${g.name}${g.code ? ` (${g.code})` : ''}` }))}
              value={
                createFormData.assignedGodownId
                  ? { value: createFormData.assignedGodownId, label: godowns.find(g => g._id === createFormData.assignedGodownId)?.name || 'Selected' }
                  : null
              }
              onChange={(opt) => handleCreateFormChange('assignedGodownId', (opt as any)?.value)}
              placeholder="Select godown"
              classNamePrefix="react-select"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateCustomer}
              disabled={createLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Customer'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerSelector;
