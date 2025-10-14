import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import type { CreateInventoryForm, Godown } from '../../types';
import { CubeIcon, ExclamationTriangleIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ValidationErrors {
  inventoryType?: string;
  dateOfStock?: string;
  quantity?: string;
  unit?: string;
  godown?: string;
  pricePerKg?: string;
}

const AddInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateInventoryForm>({
    inventoryType: 'New Stock',
    dateOfStock: new Date().toISOString().split('T')[0],
    quantity: 0,
    unit: 'Kg',
    godown: '',
    pricePerKg: 0,
    additionalNotes: ''
  });
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [godownsLoading, setGodownsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hasPermission("stock.create")) {
      navigate('/inventory');
      return;
    }
    loadGodowns();
  }, [hasPermission, navigate]);

  const loadGodowns = async () => {
    try {
      setGodownsLoading(true);
      const response = await apiService.get<{ godowns: Godown[] }>(API_CONFIG.ENDPOINTS.GODOWNS);
      if (response.success && response.data) {
        setGodowns(response.data.godowns);
      }
    } catch (err) {
      console.error('Failed to load godowns:', err);
      toast.error('Failed to load godowns');
    } finally {
      setGodownsLoading(false);
    }
  };

  const validateField = (field: string, value: any): string | undefined => {
    switch (field) {
      case 'inventoryType':
        if (!value) return 'Inventory type is required';
        break;
      case 'dateOfStock':
        if (!value) return 'Date of stock is required';
        if (new Date(value) > new Date()) return 'Date cannot be in the future';
        break;
      case 'quantity':
        if (!value || value <= 0) return 'Quantity must be greater than 0';
        break;
      case 'unit':
        if (!value) return 'Unit is required';
        break;
      case 'pricePerKg':
        if (value !== undefined && value < 0) return 'Price cannot be negative';
        break;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    newErrors.inventoryType = validateField('inventoryType', form.inventoryType);
    newErrors.dateOfStock = validateField('dateOfStock', form.dateOfStock);
    newErrors.quantity = validateField('quantity', form.quantity);
    newErrors.unit = validateField('unit', form.unit);
    newErrors.pricePerKg = validateField('pricePerKg', form.pricePerKg);

    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key as keyof ValidationErrors]) {
        delete newErrors[key as keyof ValidationErrors];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      setSaving(true);
      const response = await inventoryService.createInventory(form);
      if (response?.success) {
        toast.success('Inventory item created successfully');
        navigate('/inventory');
      } else {
        toast.error(response.message || 'Failed to create inventory item');
      }
    } catch (error: any) {
      console.error('Failed to create inventory:', error);
      toast.error(error.message || 'Failed to create inventory item');
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission("stock.create")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to create inventory items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CubeIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Add Inventory</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Create a new inventory record</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-3 sm:px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-900">Inventory Details</h2>
              <p className="text-xs text-gray-500 mt-1">Fill in the details for the new inventory item</p>
            </div>

            <div className="p-4 space-y-4">
              {/* Inventory Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Inventory Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.inventoryType}
                  onChange={(e) => handleFieldChange('inventoryType', e.target.value as any)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    errors.inventoryType ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="New Stock">New Stock</option>
                  <option value="Stock Sold">Stock Sold</option>
                  <option value="Damaged / Return">Damaged / Return</option>
                </select>
                {errors.inventoryType && (
                  <div className="flex items-center gap-1 mt-1">
                    <ExclamationTriangleIcon className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600">{errors.inventoryType}</span>
                  </div>
                )}
              </div>

              {/* Date of Stock */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date of Stock <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dateOfStock}
                  onChange={(e) => handleFieldChange('dateOfStock', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    errors.dateOfStock ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.dateOfStock && (
                  <div className="flex items-center gap-1 mt-1">
                    <ExclamationTriangleIcon className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600">{errors.dateOfStock}</span>
                  </div>
                )}
              </div>

              {/* Quantity and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity?.toString().replace(/^0+(?=\d)/, "") || ""}
                    onChange={(e) => handleFieldChange('quantity', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      errors.quantity ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.quantity && (
                    <div className="flex items-center gap-1 mt-1">
                      <ExclamationTriangleIcon className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">{errors.quantity}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => handleFieldChange('unit', e.target.value as any)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      errors.unit ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="Kg">Kg</option>
                    <option value="Quintal">Quintal</option>
                    <option value="40Kg Bag">40Kg Bag</option>
                    <option value="50Kg Bag">50Kg Bag</option>
                  </select>
                  {errors.unit && (
                    <div className="flex items-center gap-1 mt-1">
                      <ExclamationTriangleIcon className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">{errors.unit}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Godown */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Godown
                </label>
                <select
                  value={form.godown}
                  onChange={(e) => handleFieldChange('godown', e.target.value)}
                  disabled={godownsLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select Godown (Optional)</option>
                  {godowns.map(godown => (
                    <option key={godown._id} value={godown._id}>
                      {godown.name}
                    </option>
                  ))}
                </select>
                {godownsLoading && (
                  <p className="text-xs text-gray-500 mt-1">Loading godowns...</p>
                )}
              </div>

              {/* Price per Kg */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Price per Kg (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pricePerKg?.toString().replace(/^0+(?=\d)/, "") || ""}
                  onChange={(e) => handleFieldChange('pricePerKg', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    errors.pricePerKg ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.pricePerKg && (
                  <div className="flex items-center gap-1 mt-1">
                    <ExclamationTriangleIcon className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600">{errors.pricePerKg}</span>
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={form.additionalNotes}
                  onChange={(e) => handleFieldChange('additionalNotes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Any additional notes or comments..."
                />
              </div>

              {/* Total Value Display */}
              {form.quantity > 0 && form.pricePerKg && form.pricePerKg > 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      Total Value: {inventoryService.formatTotalValue(form.quantity, form.pricePerKg, form.unit)}
                    </span>
                  </div>
                </div>
              ):null}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                disabled={saving}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Create Inventory
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddInventoryPage;