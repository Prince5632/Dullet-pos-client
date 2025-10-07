import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import type { CreateCustomerForm, Godown } from '../../types';
import { BuildingOfficeIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Select from 'react-select';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { toast } from 'react-hot-toast';

interface ValidationErrors {
  businessName?: string;
  phone?: string;
  'address.street'?: string;
  'address.city'?: string;
  'address.pincode'?: string;
  email?: string;
}

const CreateCustomerPage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateCustomerForm>({
    businessName: '',
    phone: '',
    location: '',
    address: { street: '', city: '', state: 'Punjab', pincode: '', country: 'India' },
    customerType: 'Retailer',
    notes: '',
    assignedGodownId: '',
    email: ''
  });
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [godownsLoading, setGodownsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
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

  // Validation functions
  const validateField = (path: string, value: any): string | undefined => {
    switch (path) {
      case 'businessName':
        if (!value || !value.trim()) return 'Business name is required';
        if (value.trim().length < 2) return 'Business name must be at least 2 characters';
        break;
      case 'phone':
        if (!value || !value.trim()) return 'Phone number is required';
        if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 10-digit phone number';
        break;
      case 'email':
        if (value && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'address.street':
        if (!value || !value.trim()) return 'Street address is required';
        break;
      case 'address.city':
        if (!value || !value.trim()) return 'City is required';
        break;
      case 'address.pincode':
        if (!value || !value.trim()) return 'Pincode is required';
        if (!/^\d{6}$/.test(value.replace(/\D/g, ''))) return 'Please enter a valid 6-digit pincode';
        break;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Validate all required fields
    newErrors.businessName = validateField('businessName', form.businessName);
    newErrors.phone = validateField('phone', form.phone);
    newErrors.email = validateField('email', form.email);
    newErrors['address.street'] = validateField('address.street', form.address.street);
    newErrors['address.city'] = validateField('address.city', form.address.city);
    newErrors['address.pincode'] = validateField('address.pincode', form.address.pincode);

    // Remove undefined errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key as keyof ValidationErrors]) {
        delete newErrors[key as keyof ValidationErrors];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const update = (path: string, value: any) => {
    if (path.includes('.')) {
      const [p, c] = path.split('.');
      setForm(prev => ({ ...prev, [p]: { ...(prev as any)[p], [c]: value } }));
    } else {
      setForm(prev => ({ ...prev, [path]: value }));
    }

    // Mark field as touched and validate
    setTouched(prev => ({ ...prev, [path]: true }));
    
    // Clear error for this field if it becomes valid
    const error = validateField(path, value);
    setErrors(prev => ({
      ...prev,
      [path]: error
    }));
  };

  const handleBlur = (path: string) => {
    setTouched(prev => ({ ...prev, [path]: true }));
    const value = path.includes('.') 
      ? form.address[path.split('.')[1] as keyof typeof form.address]
      : (form as any)[path];
    const error = validateField(path, value);
    setErrors(prev => ({
      ...prev,
      [path]: error
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allFields = ['businessName', 'phone', 'email', 'address.street', 'address.city', 'address.pincode'];
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    setSaving(true);
    try {
      const created = await customerService.createCustomer(form);
      toast.success('Customer created successfully!');
      navigate(`/customers/${created._id}`);
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      toast.error(error?.message || 'Failed to create customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get input classes based on validation state
  const getInputClasses = (fieldPath: string) => {
    const hasError = touched[fieldPath] && errors[fieldPath as keyof ValidationErrors];
    const isValid = touched[fieldPath] && !errors[fieldPath as keyof ValidationErrors];
    
    return `px-3 py-2.5 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 ${
      hasError 
        ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' 
        : isValid
        ? 'border-green-300 focus:border-green-500 focus:ring-green-200 bg-green-50'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 bg-white hover:border-gray-400'
    }`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <BuildingOfficeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Create New Customer</h1>
              <p className="text-sm text-gray-600">Add a new customer with complete business details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={submit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
              <p className="text-sm text-gray-600">Enter the customer's primary business details</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={e => update('businessName', e.target.value)}
                    onBlur={() => handleBlur('businessName')}
                    className={getInputClasses('businessName')}
                    placeholder="Enter business name"
                  />
                  {touched.businessName && errors.businessName && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched.businessName && !errors.businessName && form.businessName && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched.businessName && errors.businessName && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => update('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={getInputClasses('phone')}
                    placeholder="Enter phone number"
                  />
                  {touched.phone && errors.phone && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched.phone && !errors.phone && form.phone && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched.phone && errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={e => update('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={getInputClasses('email')}
                    placeholder="Enter email address (optional)"
                  />
                  {touched.email && errors.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched.email && !errors.email && form.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched.email && errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Customer Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Type
                </label>
                <select
                  value={form.customerType}
                  onChange={e => update('customerType', e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors duration-200"
                >
                  <option value="Retailer">Retailer</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Wholesaler">Wholesaler</option>
                </select>
              </div>

              {/* Google Maps Link */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Maps Link
                </label>
                <input
                  type="url"
                  value={form.location || ''}
                  onChange={e => update('location', e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors duration-200 w-full"
                  placeholder="Paste Google Maps share link (optional)"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Address Information</h2>
              <p className="text-sm text-gray-600">Complete address details for the customer</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Street Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.address.street}
                    onChange={e => update('address.street', e.target.value)}
                    onBlur={() => handleBlur('address.street')}
                    className={getInputClasses('address.street')}
                    placeholder="Enter complete street address"
                  />
                  {touched['address.street'] && errors['address.street'] && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched['address.street'] && !errors['address.street'] && form.address.street && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched['address.street'] && errors['address.street'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['address.street']}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.address.city}
                    onChange={e => update('address.city', e.target.value)}
                    onBlur={() => handleBlur('address.city')}
                    className={getInputClasses('address.city')}
                    placeholder="Enter city"
                  />
                  {touched['address.city'] && errors['address.city'] && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched['address.city'] && !errors['address.city'] && form.address.city && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched['address.city'] && errors['address.city'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['address.city']}</p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={form.address.state}
                  onChange={e => update('address.state', e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors duration-200 w-full"
                  placeholder="Enter state"
                />
              </div>

              {/* Pincode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.address.pincode}
                    onChange={e => update('address.pincode', e.target.value)}
                    onBlur={() => handleBlur('address.pincode')}
                    className={getInputClasses('address.pincode')}
                    placeholder="Enter 6-digit pincode"
                  />
                  {touched['address.pincode'] && errors['address.pincode'] && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched['address.pincode'] && !errors['address.pincode'] && form.address.pincode && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched['address.pincode'] && errors['address.pincode'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['address.pincode']}</p>
                )}
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={form.address.country}
                  onChange={e => update('address.country', e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors duration-200 w-full"
                  placeholder="Enter country"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
              <p className="text-sm text-gray-600">Optional details and assignments</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Assigned Godown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Godown
                </label>
                <Select
                  isLoading={godownsLoading}
                  options={godowns.map(g => ({ value: g._id, label: `${g.name}${g.code ? ` (${g.code})` : ''}` }))}
                  value={
                    form.assignedGodownId
                      ? { value: form.assignedGodownId, label: godowns.find(g => g._id === form.assignedGodownId)?.name || 'Selected' }
                      : null
                  }
                  onChange={(opt) => update('assignedGodownId', (opt as any)?.value || '')}
                  placeholder="Select a godown (optional)"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
                      '&:hover': {
                        borderColor: '#9ca3af'
                      }
                    })
                  }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => update('notes', e.target.value)}
                  rows={3}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors duration-200 w-full resize-none"
                  placeholder="Add any additional notes about the customer (optional)"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Customer...
                </div>
              ) : (
                'Create Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCustomerPage;


