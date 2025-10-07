import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, UserIcon, PlusIcon, XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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
  
  // Validation states for create modal
  interface ValidationErrors {
    businessName?: string;
    phone?: string;
    email?: string;
    'address.street'?: string;
    'address.city'?: string;
    'address.pincode'?: string;
  }
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
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

  // Validation functions
  const validateField = (fieldPath: string, value: string): string => {
    switch (fieldPath) {
      case 'businessName':
        if (!value.trim()) return 'Business name is required';
        if (value.trim().length < 2) return 'Business name must be at least 2 characters';
        return '';
      
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
        if (!phoneRegex.test(value.trim())) return 'Please enter a valid phone number';
        return '';
      
      case 'email':
        if (value && value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
        }
        return '';
      
      case 'address.street':
        if (!value.trim()) return 'Street address is required';
        return '';
      
      case 'address.city':
        if (!value.trim()) return 'City is required';
        return '';
      
      case 'address.pincode':
        if (!value.trim()) return 'Pincode is required';
        const pincodeRegex = /^\d{6}$/;
        if (!pincodeRegex.test(value.trim())) return 'Pincode must be 6 digits';
        return '';
      
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Validate required fields
    newErrors.businessName = validateField('businessName', createFormData.businessName);
    newErrors.phone = validateField('phone', createFormData.phone);
    newErrors['address.street'] = validateField('address.street', createFormData.address.street);
    newErrors['address.city'] = validateField('address.city', createFormData.address.city);
    newErrors['address.pincode'] = validateField('address.pincode', createFormData.address.pincode);
    
    // Remove empty errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key as keyof ValidationErrors]) {
        delete newErrors[key as keyof ValidationErrors];
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (fieldPath: string) => {
    setTouched(prev => ({ ...prev, [fieldPath]: true }));
    
    let value = '';
    if (fieldPath.includes('.')) {
      const [parent, child] = fieldPath.split('.');
      value = (createFormData as any)[parent][child] || '';
    } else {
      value = (createFormData as any)[fieldPath] || '';
    }
    
    const error = validateField(fieldPath, value);
    setErrors(prev => ({ ...prev, [fieldPath]: error }));
  };

  const handleCreateCustomer = async () => {
    try {
      setCreateLoading(true);
      
      // Mark all fields as touched for validation display
      const allFields = ['businessName', 'phone', 'address.street', 'address.city', 'address.pincode'];
      const newTouched: Record<string, boolean> = {};
      allFields.forEach(field => {
        newTouched[field] = true;
      });
      setTouched(newTouched);
      
      // Validate form
      if (!validateForm()) {
        toast.error('Please fix the validation errors before submitting');
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
        assignedGodownId: '',
      });
      setErrors({});
      setTouched({});
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
    
    // Validate field if it has been touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
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
      assignedGodownId: '',
    });
    setErrors({});
    setTouched({});
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
          {/* Helper function for input classes */}
          {(() => {
            const getInputClasses = (fieldPath: string) => {
              const hasError = touched[fieldPath] && errors[fieldPath as keyof ValidationErrors];
              const isValid = touched[fieldPath] && !errors[fieldPath as keyof ValidationErrors];
              
              return `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors ${
                hasError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50' 
                  : isValid
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`;
            };

            return (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={createFormData.businessName}
                      onChange={(e) => handleCreateFormChange('businessName', e.target.value)}
                      onBlur={() => handleBlur('businessName')}
                      className={getInputClasses('businessName')}
                      placeholder="Enter business name"
                    />
                    {touched.businessName && errors.businessName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                    {touched.businessName && !errors.businessName && createFormData.businessName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {touched.businessName && errors.businessName && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                  )}
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
                  <div className="relative">
                    <input
                      type="tel"
                      value={createFormData.phone}
                      onChange={(e) => handleCreateFormChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      className={getInputClasses('phone')}
                      placeholder="Enter phone number"
                    />
                    {touched.phone && errors.phone && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                    {touched.phone && !errors.phone && createFormData.phone && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {touched.phone && errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={createFormData.address.street}
                      onChange={(e) => handleCreateFormChange('address.street', e.target.value)}
                      onBlur={() => handleBlur('address.street')}
                      className={getInputClasses('address.street')}
                      placeholder="Enter street address"
                    />
                    {touched['address.street'] && errors['address.street'] && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                    {touched['address.street'] && !errors['address.street'] && createFormData.address.street && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {touched['address.street'] && errors['address.street'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['address.street']}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={createFormData.address.city}
                        onChange={(e) => handleCreateFormChange('address.city', e.target.value)}
                        onBlur={() => handleBlur('address.city')}
                        className={getInputClasses('address.city')}
                        placeholder="Enter city"
                      />
                      {touched['address.city'] && errors['address.city'] && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                      {touched['address.city'] && !errors['address.city'] && createFormData.address.city && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                    {touched['address.city'] && errors['address.city'] && (
                      <p className="mt-1 text-sm text-red-600">{errors['address.city']}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={createFormData.address.pincode}
                        onChange={(e) => handleCreateFormChange('address.pincode', e.target.value)}
                        onBlur={() => handleBlur('address.pincode')}
                        className={getInputClasses('address.pincode')}
                        placeholder="Enter pincode"
                      />
                      {touched['address.pincode'] && errors['address.pincode'] && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                      {touched['address.pincode'] && !errors['address.pincode'] && createFormData.address.pincode && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                    {touched['address.pincode'] && errors['address.pincode'] && (
                      <p className="mt-1 text-sm text-red-600">{errors['address.pincode']}</p>
                    )}
                  </div>
                </div>
              </>
            );
          })()}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Type
            </label>
            <select
              value={createFormData.customerType}
              onChange={(e) => handleCreateFormChange('customerType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Godown
            </label>
            <select
              value={createFormData.assignedGodownId || ''}
              onChange={(e) => handleCreateFormChange('assignedGodownId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a godown</option>
              {godowns.map((godown) => (
                <option key={godown._id} value={godown._id}>
                  {godown.name}
                </option>
              ))}
            </select>
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
