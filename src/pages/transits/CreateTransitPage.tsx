import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transitService } from '../../services/transitService';
import { godownService } from '../../services/godownService';
import { userService } from '../../services/userService';
import type { CreateTransitForm, Godown, User } from '../../types';
import { TruckIcon, ExclamationTriangleIcon, CheckCircleIcon, MapPinIcon, CalendarIcon, UserIcon, CubeIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface ValidationErrors {
  productName?: string;
  quantity?: string;
  unit?: string;
  fromLocation?: string;
  toLocation?: string;
  dateOfDispatch?: string;
  expectedArrivalDate?: string;
  vehicleNumber?: string;
  driverId?: string;
  assignedTo?: string;
}

const CreateTransitPage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTransitForm>({
    productId: '',
    productName: '',
    quantity: 0,
    unit: 'KG',
    fromLocation: '',
    toLocation: '',
    dateOfDispatch: '',
    expectedArrivalDate: '',
    vehicleNumber: '',
    driverId: '',
    assignedTo: '',
    productDetails: '',
    transporterName: '',
    remarks: '',
    attachments: []
  });
  
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [godownsLoading, setGodownsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadGodowns();
    loadUsers();
  }, []);

  const loadGodowns = async () => {
    try {
      setGodownsLoading(true);
      const res = await godownService.getGodowns();
      if (res.success && res.data) {
        setGodowns(res.data.godowns || []);
      }
    } catch (err) {
      console.error('Failed to load godowns:', err);
      toast.error('Failed to load godowns');
    } finally {
      setGodownsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await userService.getUsers({ limit: 100 });
      if (res.success && res.data) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const validateField = (field: string, value: any): string | undefined => {
    switch (field) {
      case 'productName':
        if (!value || !value.trim()) return 'Product name is required';
        if (value.trim().length < 2) return 'Product name must be at least 2 characters';
        break;
      case 'quantity':
        if (!value || value <= 0) return 'Quantity must be greater than 0';
        break;
      case 'unit':
        if (!value || !value.trim()) return 'Unit is required';
        break;
      case 'fromLocation':
        if (!value || !value.trim()) return 'From location is required';
        break;
      case 'toLocation':
        if (!value || !value.trim()) return 'To location is required';
        break;
      case 'dateOfDispatch':
        if (!value || !value.trim()) return 'Dispatch date is required';
        if (new Date(value) < new Date(new Date().toDateString())) {
          return 'Dispatch date cannot be in the past';
        }
        break;
      case 'expectedArrivalDate':
        if (!value || !value.trim()) return 'Expected arrival date is required';
        if (form.dateOfDispatch && new Date(value) <= new Date(form.dateOfDispatch)) {
          return 'Expected arrival date must be after dispatch date';
        }
        break;
      case 'vehicleNumber':
        if (!value || !value.trim()) return 'Vehicle number is required';
        break;
      case 'driverId':
        if (!value || !value.trim()) return 'Driver is required';
        break;
      case 'assignedTo':
        if (!value || !value.trim()) return 'Assigned to is required';
        break;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    newErrors.productName = validateField('productName', form.productName);
    newErrors.quantity = validateField('quantity', form.quantity);
    newErrors.unit = validateField('unit', form.unit);
    newErrors.fromLocation = validateField('fromLocation', form.fromLocation);
    newErrors.toLocation = validateField('toLocation', form.toLocation);
    newErrors.dateOfDispatch = validateField('dateOfDispatch', form.dateOfDispatch);
    newErrors.expectedArrivalDate = validateField('expectedArrivalDate', form.expectedArrivalDate);
    newErrors.vehicleNumber = validateField('vehicleNumber', form.vehicleNumber);
    newErrors.driverId = validateField('driverId', form.driverId);
    newErrors.assignedTo = validateField('assignedTo', form.assignedTo);

    // Remove undefined errors
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key as keyof ValidationErrors]) {
        delete newErrors[key as keyof ValidationErrors];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = (form as any)[field];
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const allFields = ['productName', 'quantity', 'unit', 'fromLocation', 'toLocation', 'dateOfDispatch', 'expectedArrivalDate', 'vehicleNumber', 'driverId', 'assignedTo'];
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    setSaving(true);
    try {
      const created = await transitService.createTransit(form);
      toast.success('Transit created successfully!');
      navigate('/transits');
    } catch (error: any) {
      console.error('Failed to create transit:', error);
      toast.error(error?.message || 'Failed to create transit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (field: string) => {
    return touched[field] && errors[field as keyof ValidationErrors];
  };

  const drivers = users.filter(user => 
    user.department === 'Warehouse' || 
    user.role.name.toLowerCase().includes('driver') ||
    user.position.toLowerCase().includes('driver')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Create New Transit</h1>
                <p className="text-sm text-gray-600">Add product transit information</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/transits')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <CubeIcon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-medium text-gray-900">Product Information</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.productName}
                    onChange={(e) => updateField('productName', e.target.value)}
                    onBlur={() => handleBlur('productName')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('productName') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter product name"
                  />
                  {getFieldError('productName') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('productName')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Details
                  </label>
                  <input
                    type="text"
                    value={form.productDetails || ''}
                    onChange={(e) => updateField('productDetails', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional product details"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
                    onBlur={() => handleBlur('quantity')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('quantity') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter quantity"
                  />
                  {getFieldError('quantity') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('quantity')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => updateField('unit', e.target.value)}
                    onBlur={() => handleBlur('unit')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('unit') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="KG">KG</option>
                    <option value="Quintal">Quintal</option>
                    <option value="Ton">Ton</option>
                    <option value="Bags">Bags</option>
                  </select>
                  {getFieldError('unit') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('unit')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-medium text-gray-900">Location Information</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.fromLocation}
                    onChange={(e) => updateField('fromLocation', e.target.value)}
                    onBlur={() => handleBlur('fromLocation')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('fromLocation') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={godownsLoading}
                  >
                    <option value="">Select from location</option>
                    {godowns.map(godown => (
                      <option key={godown._id} value={godown.name}>
                        {godown.name} - {godown.location.city}, {godown.location.state}
                      </option>
                    ))}
                  </select>
                  {getFieldError('fromLocation') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('fromLocation')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.toLocation}
                    onChange={(e) => updateField('toLocation', e.target.value)}
                    onBlur={() => handleBlur('toLocation')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('toLocation') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={godownsLoading}
                  >
                    <option value="">Select to location</option>
                    {godowns.map(godown => (
                      <option key={godown._id} value={godown.name}>
                        {godown.name} - {godown.location.city}, {godown.location.state}
                      </option>
                    ))}
                  </select>
                  {getFieldError('toLocation') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('toLocation')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-medium text-gray-900">Schedule Information</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dispatch Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.dateOfDispatch}
                    onChange={(e) => updateField('dateOfDispatch', e.target.value)}
                    onBlur={() => handleBlur('dateOfDispatch')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('dateOfDispatch') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('dateOfDispatch') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('dateOfDispatch')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Arrival Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.expectedArrivalDate}
                    onChange={(e) => updateField('expectedArrivalDate', e.target.value)}
                    onBlur={() => handleBlur('expectedArrivalDate')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('expectedArrivalDate') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('expectedArrivalDate') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('expectedArrivalDate')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Transport Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-medium text-gray-900">Transport Information</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(e) => updateField('vehicleNumber', e.target.value.toUpperCase())}
                    onBlur={() => handleBlur('vehicleNumber')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('vehicleNumber') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter vehicle number"
                  />
                  {getFieldError('vehicleNumber') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('vehicleNumber')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transporter Name
                  </label>
                  <input
                    type="text"
                    value={form.transporterName || ''}
                    onChange={(e) => updateField('transporterName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter transporter name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-medium text-gray-900">Assignment Information</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.driverId}
                    onChange={(e) => updateField('driverId', e.target.value)}
                    onBlur={() => handleBlur('driverId')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('driverId') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={usersLoading}
                  >
                    <option value="">Select driver</option>
                    {drivers.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} - {user.position}
                      </option>
                    ))}
                  </select>
                  {getFieldError('driverId') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('driverId')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.assignedTo}
                    onChange={(e) => updateField('assignedTo', e.target.value)}
                    onBlur={() => handleBlur('assignedTo')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      getFieldError('assignedTo') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={usersLoading}
                  >
                    <option value="">Select assignee</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} - {user.position}
                      </option>
                    ))}
                  </select>
                  {getFieldError('assignedTo') && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {getFieldError('assignedTo')}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={form.remarks || ''}
                  onChange={(e) => updateField('remarks', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional remarks or notes"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Transit...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Create Transit</span>
                </div>
              )}
            </button>
          </div>

          {/* Helper Text */}
          <div className="text-center pb-2">
            <p className="text-sm text-gray-500">
              Fields marked with <span className="text-red-500">*</span> are required
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTransitPage;