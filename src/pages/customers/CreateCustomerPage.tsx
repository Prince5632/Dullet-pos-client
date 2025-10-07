import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import type { CreateCustomerForm, Godown } from '../../types';
import { BuildingOfficeIcon, ExclamationTriangleIcon, CheckCircleIcon, MapPinIcon, EnvelopeIcon, PhoneIcon, UserGroupIcon, DocumentTextIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
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
    
    newErrors.businessName = validateField('businessName', form.businessName);
    newErrors.phone = validateField('phone', form.phone);
    newErrors.email = validateField('email', form.email);
    newErrors['address.street'] = validateField('address.street', form.address.street);
    newErrors['address.city'] = validateField('address.city', form.address.city);
    newErrors['address.pincode'] = validateField('address.pincode', form.address.pincode);

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

    setTouched(prev => ({ ...prev, [path]: true }));
    
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

  const getInputClasses = (fieldPath: string) => {
    const hasError = touched[fieldPath] && errors[fieldPath as keyof ValidationErrors];
    const isValid = touched[fieldPath] && !errors[fieldPath as keyof ValidationErrors];
    
    return `w-full pl-11 pr-11 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 ${
      hasError 
        ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/50' 
        : isValid
        ? 'border-green-400 focus:border-green-500 focus:ring-green-100 bg-green-50/50'
        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 bg-white hover:border-gray-300'
    }`;
  };

  const getIconClasses = (fieldPath: string) => {
    const hasError = touched[fieldPath] && errors[fieldPath as keyof ValidationErrors];
    const isValid = touched[fieldPath] && !errors[fieldPath as keyof ValidationErrors];
    
    return `w-5 h-5 transition-colors duration-200 ${
      hasError ? 'text-red-400' : isValid ? 'text-green-500' : 'text-gray-400'
    }`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 transform hover:scale-105 transition-transform duration-200">
                  <BuildingOfficeIcon className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Customer</h1>
                <p className="text-sm text-gray-600 mt-0.5">Add complete business and contact information</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={submit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 shadow-xl shadow-gray-200/50 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/60 transition-all duration-300">
            <div className="px-7 py-5 border-b-2 border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <UserGroupIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Basic Information</h2>
                  <p className="text-sm text-gray-600">Primary business and contact details</p>
                </div>
              </div>
            </div>
            <div className="p-7 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <BuildingStorefrontIcon className="w-4 h-4 text-blue-500" />
                  Business Name <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <BuildingStorefrontIcon className={getIconClasses('businessName')} />
                  </div>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={e => update('businessName', e.target.value)}
                    onBlur={() => handleBlur('businessName')}
                    className={getInputClasses('businessName')}
                    placeholder="Enter business name"
                  />
                  {touched.businessName && errors.businessName && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center animate-shake">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched.businessName && !errors.businessName && form.businessName && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center animate-bounce-in">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched.businessName && errors.businessName && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5 animate-slide-down">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {errors.businessName}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <PhoneIcon className="w-4 h-4 text-blue-500" />
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <PhoneIcon className={getIconClasses('phone')} />
                  </div>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => update('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={getInputClasses('phone')}
                    placeholder="10-digit number"
                  />
                  {touched.phone && errors.phone && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched.phone && !errors.phone && form.phone && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched.phone && errors.phone && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <EnvelopeIcon className="w-4 h-4 text-blue-500" />
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeIcon className={getIconClasses('email')} />
                  </div>
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={e => update('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={getInputClasses('email')}
                    placeholder="email@example.com"
                  />
                  {touched.email && errors.email && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched.email && !errors.email && form.email && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched.email && errors.email && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Customer Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Customer Type
                </label>
                <select
                  value={form.customerType}
                  onChange={e => update('customerType', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white hover:border-gray-300 transition-all duration-200 font-medium"
                >
                  <option value="Retailer">🏪 Retailer</option>
                  <option value="Distributor">📦 Distributor</option>
                  <option value="Wholesaler">🏭 Wholesaler</option>
                </select>
              </div>

              {/* Google Maps Link */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <MapPinIcon className="w-4 h-4 text-blue-500" />
                  Google Maps Link
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MapPinIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={form.location || ''}
                    onChange={e => update('location', e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white hover:border-gray-300 transition-all duration-200"
                    placeholder="Paste Google Maps share link"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 shadow-xl shadow-gray-200/50 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/60 transition-all duration-300">
            <div className="px-7 py-5 border-b-2 border-gray-200/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <MapPinIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Address Information</h2>
                  <p className="text-sm text-gray-600">Complete location details</p>
                </div>
              </div>
            </div>
            <div className="p-7 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Street Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.address.street}
                    onChange={e => update('address.street', e.target.value)}
                    onBlur={() => handleBlur('address.street')}
                    className={`w-full px-4 py-3 pr-11 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 ${
                      touched['address.street'] && errors['address.street']
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/50'
                        : touched['address.street'] && !errors['address.street'] && form.address.street
                        ? 'border-green-400 focus:border-green-500 focus:ring-green-100 bg-green-50/50'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 bg-white hover:border-gray-300'
                    }`}
                    placeholder="Building, Street, Area"
                  />
                  {touched['address.street'] && errors['address.street'] && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched['address.street'] && !errors['address.street'] && form.address.street && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched['address.street'] && errors['address.street'] && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {errors['address.street']}
                  </p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  City <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.address.city}
                    onChange={e => update('address.city', e.target.value)}
                    onBlur={() => handleBlur('address.city')}
                    className={`w-full px-4 py-3 pr-11 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 ${
                      touched['address.city'] && errors['address.city']
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/50'
                        : touched['address.city'] && !errors['address.city'] && form.address.city
                        ? 'border-green-400 focus:border-green-500 focus:ring-green-100 bg-green-50/50'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 bg-white hover:border-gray-300'
                    }`}
                    placeholder="City name"
                  />
                  {touched['address.city'] && errors['address.city'] && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched['address.city'] && !errors['address.city'] && form.address.city && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched['address.city'] && errors['address.city'] && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {errors['address.city']}
                  </p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  State
                </label>
                <input
                  type="text"
                  value={form.address.state}
                  onChange={e => update('address.state', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white hover:border-gray-300 transition-all duration-200"
                  placeholder="State"
                />
              </div>

              {/* Pincode */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.address.pincode}
                    onChange={e => update('address.pincode', e.target.value)}
                    onBlur={() => handleBlur('address.pincode')}
                    className={`w-full px-4 py-3 pr-11 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 ${
                      touched['address.pincode'] && errors['address.pincode']
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/50'
                        : touched['address.pincode'] && !errors['address.pincode'] && form.address.pincode
                        ? 'border-green-400 focus:border-green-500 focus:ring-green-100 bg-green-50/50'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100 bg-white hover:border-gray-300'
                    }`}
                    placeholder="6-digit pincode"
                  />
                  {touched['address.pincode'] && errors['address.pincode'] && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  {touched['address.pincode'] && !errors['address.pincode'] && form.address.pincode && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {touched['address.pincode'] && errors['address.pincode'] && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {errors['address.pincode']}
                  </p>
                )}
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Country
                </label>
                <input
                  type="text"
                  value={form.address.country}
                  onChange={e => update('address.country', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white hover:border-gray-300 transition-all duration-200"
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border-2 border-gray-200/50 shadow-xl shadow-gray-200/50 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/60 transition-all duration-300">
            <div className="px-7 py-5 border-b-2 border-gray-200/50 bg-gradient-to-r from-purple-50/50 to-pink-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Additional Information</h2>
                  <p className="text-sm text-gray-600">Optional details and notes</p>
                </div>
              </div>
            </div>
            <div className="p-7 space-y-6">
              {/* Assigned Godown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                      borderWidth: '2px',
                      borderRadius: '0.75rem',
                      padding: '0.375rem',
                      borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
                      boxShadow: state.isFocused ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none',
                      '&:hover': {
                        borderColor: '#d1d5db'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
                      color: state.isSelected ? 'white' : '#1f2937',
                      padding: '0.75rem 1rem',
                      cursor: 'pointer'
                    })
                  }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Notes
                </label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => update('notes', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white hover:border-gray-300 transition-all duration-200 resize-none"
                  placeholder="Add any additional notes or special instructions..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="sm:flex-1 sm:max-w-[200px] px-8 py-4 border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="sm:flex-1 px-8 py-4 rounded-xl text-white bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transform"
            >
              {saving ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Customer...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Create Customer</span>
                </div>
              )}
            </button>
          </div>

          {/* Helper Text */}
          <div className="text-center pb-4">
            <p className="text-sm text-gray-500">
              Fields marked with <span className="text-red-500 font-semibold">*</span> are required
            </p>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        
        @keyframes bounce-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out;
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CreateCustomerPage;