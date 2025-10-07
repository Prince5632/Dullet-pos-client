import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import type { Customer, UpdateCustomerForm, Godown } from '../../types';
import { BuildingOfficeIcon, ExclamationTriangleIcon, CheckCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Select from 'react-select';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { toast } from 'react-hot-toast';

interface ValidationErrors {
  businessName?: string;
  phone?: string;
  email?: string;
  location?: string;
  'address.street'?: string;
  'address.city'?: string;
  'address.state'?: string;
  'address.pincode'?: string;
  customerType?: string;
}

const EditCustomerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<UpdateCustomerForm>({});
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [godownsLoading, setGodownsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      if (!id) return;
      const data = await customerService.getCustomerById(id);
      setCustomer(data);
      setForm({
        businessName: data.businessName,
        phone: data.phone,
        email: data.email,
        location: data.location,
        address: data.address,
        customerType: data.customerType,
        notes: data.notes,
        assignedGodownId: (data as any).assignedGodownId,
      });
    })();
  }, [id]);

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
      case 'location':
        if (value && value.trim()) {
          try {
            new URL(value.trim());
          } catch {
            return 'Please enter a valid URL for Google Maps link';
          }
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
      case 'customerType':
        if (!value || !value.trim()) return 'Customer type is required';
        break;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    newErrors.businessName = validateField('businessName', form.businessName);
    newErrors.phone = validateField('phone', form.phone);
    newErrors.email = validateField('email', form.email);
    newErrors.customerType = validateField('customerType', form.customerType);
    newErrors['address.street'] = validateField('address.street', form.address?.street);
    newErrors['address.city'] = validateField('address.city', form.address?.city);
    newErrors['address.pincode'] = validateField('address.pincode', form.address?.pincode);

    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key as keyof ValidationErrors]) {
        delete newErrors[key as keyof ValidationErrors];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (path: string) => {
    setTouched(prev => ({ ...prev, [path]: true }));
    const value = path.includes('.') 
      ? form.address?.[path.split('.')[1] as keyof typeof form.address]
      : (form as any)[path];
    const error = validateField(path, value);
    setErrors(prev => ({
      ...prev,
      [path]: error
    }));
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

  const getInputClasses = (fieldPath: string) => {
    const hasError = touched[fieldPath] && errors[fieldPath as keyof ValidationErrors];
    const isValid = touched[fieldPath] && !errors[fieldPath as keyof ValidationErrors];
    
    return `w-full px-3 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
      hasError 
        ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' 
        : isValid
        ? 'border-green-300 focus:border-green-500 focus:ring-green-200 bg-green-50'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 bg-white hover:border-gray-400'
    }`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const allFields = ['businessName', 'phone', 'email', 'customerType', 'address.street', 'address.city', 'address.pincode'];
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    setSaving(true);
    try {
      await customerService.updateCustomer(id, form);
      toast.success('Customer updated successfully!');
      navigate(`/customers/${id}`);
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      toast.error(error?.message || 'Failed to update customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Edit Customer</h1>
                <p className="text-sm text-gray-600">Update business and contact information</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/customers/${id}`)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={submit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.businessName || ''}
                    onChange={e => update('businessName', e.target.value)}
                    onBlur={() => handleBlur('businessName')}
                    className={getInputClasses('businessName')}
                    placeholder="Enter business name"
                  />
                  {touched.businessName && errors.businessName && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {touched.businessName && !errors.businessName && form.businessName && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
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
                    value={form.phone || ''}
                    onChange={e => update('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={getInputClasses('phone')}
                    placeholder="10-digit number"
                  />
                  {touched.phone && errors.phone && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {touched.phone && !errors.phone && form.phone && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
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
                    placeholder="email@example.com"
                  />
                  {touched.email && errors.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {touched.email && !errors.email && form.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
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
                  Customer Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.customerType || ''}
                  onChange={e => update('customerType', e.target.value)}
                  onBlur={() => handleBlur('customerType')}
                  className={getInputClasses('customerType')}
                >
                  <option value="">Select customer type</option>
                  {/* <option value="Individual">Individual</option>
                  <option value="Business">Business</option> */}
                  <option value="Retailer">Retailer</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Wholesaler">Wholesaler</option>
                </select>
                {touched.customerType && errors.customerType && (
                  <p className="mt-1 text-sm text-red-600">{errors.customerType}</p>
                )}
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
                  onBlur={() => handleBlur('location')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Paste Google Maps share link"
                />
                {touched.location && errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Address Information</h2>
              <p className="text-sm text-gray-600">Complete location details</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Street Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.address?.street || ''}
                    onChange={e => update('address.street', e.target.value)}
                    onBlur={() => handleBlur('address.street')}
                    className={getInputClasses('address.street')}
                    placeholder="Building, Street, Area"
                  />
                  {touched['address.street'] && errors['address.street'] && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {touched['address.street'] && !errors['address.street'] && form.address?.street && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
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
                    value={form.address?.city || ''}
                    onChange={e => update('address.city', e.target.value)}
                    onBlur={() => handleBlur('address.city')}
                    className={getInputClasses('address.city')}
                    placeholder="City name"
                  />
                  {touched['address.city'] && errors['address.city'] && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {touched['address.city'] && !errors['address.city'] && form.address?.city && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
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
                  value={form.address?.state || ''}
                  onChange={e => update('address.state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="State"
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
                    value={form.address?.pincode || ''}
                    onChange={e => update('address.pincode', e.target.value)}
                    onBlur={() => handleBlur('address.pincode')}
                    className={getInputClasses('address.pincode')}
                    placeholder="6-digit pincode"
                  />
                  {touched['address.pincode'] && errors['address.pincode'] && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {touched['address.pincode'] && !errors['address.pincode'] && form.address?.pincode && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
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
                  value={form.address?.country || ''}
                  onChange={e => update('address.country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
              <p className="text-sm text-gray-600">Optional details and notes</p>
            </div>
            <div className="p-6 space-y-4">
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
                  onChange={(opt) => update('assignedGodownId', (opt as any)?.value)}
                  placeholder="Select godown"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
                      '&:hover': {
                        borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter any additional notes"
                  rows={3}
                  value={form.notes || ''}
                  onChange={e => update('notes', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => navigate(`/customers/${id}`)} 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCustomerPage;


