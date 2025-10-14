import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
import { API_CONFIG } from '../../config/api';
import { type Inventory,type Godown, type UpdateInventoryForm } from '../../types';
import { CubeIcon, ExclamationTriangleIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface ValidationErrors {
  inventoryType?: string;
  dateOfStock?: string;
  quantity?: string;
  unit?: string;
  godown?: string;
  pricePerKg?: string;
}

const EditInventoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [formData, setFormData] = useState<UpdateInventoryForm>({
    inventoryType: 'New Stock',
    dateOfStock: '',
    quantity: 0,
    unit: 'Kg',
    godown: '',
    pricePerKg: 0,
    additionalNotes: ''
  });
  
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!hasPermission('stock.update')) {
      navigate('/inventory');
      return;
    }

    loadInventoryData();
    loadGodowns();
  }, [id, hasPermission, navigate]);

  const loadInventoryData = async () => {
    if (!id) return;
    
    try {
      setLoadingData(true);
      const response = await inventoryService.getInventoryById(id);
      
      if (response.success && response.data?.inventory) {
        const inventory = response.data.inventory;
        // Format date for input field
        const formattedDate = inventory.dateOfStock ? 
          new Date(inventory.dateOfStock).toISOString().split('T')[0] : '';
        
        setFormData({
          inventoryType: inventory.inventoryType || 'New Stock',
          dateOfStock: formattedDate,
          quantity: inventory.quantity || 0,
          unit: inventory.unit || 'Kg',
          godown: inventory.godown?._id || inventory.godown || '',
          pricePerKg: inventory.pricePerKg || 0,
          additionalNotes: inventory.additionalNotes || ''
        });
      } else {
        setErrorMessage('Inventory item not found');
        navigate('/inventory');
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      setErrorMessage('Failed to load inventory data');
    } finally {
      setLoadingData(false);
    }
  };

  const loadGodowns = async () => {
    try {
      const response = await apiService.get(API_CONFIG.ENDPOINTS.GODOWNS);
      setGodowns(response.data?.godowns || []);
    } catch (error) {
      console.error('Error loading godowns:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.inventoryType?.trim()) {
      newErrors.inventoryType = 'Inventory type is required';
    }

    if (!formData.dateOfStock) {
      newErrors.dateOfStock = 'Date of stock is required';
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (!formData.unit?.trim()) {
      newErrors.unit = 'Unit is required';
    }

    if (!formData.godown) {
      newErrors.godown = 'Godown is required';
    }

    if (!formData.pricePerKg || formData.pricePerKg <= 0) {
      newErrors.pricePerKg = 'Price per Kg must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !id) return;

    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      await inventoryService.updateInventory(id, formData);
      
      setSuccessMessage('Inventory updated successfully!');
      
      // Navigate back to inventory list after a short delay
      setTimeout(() => {
        navigate('/inventory');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error updating inventory:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'pricePerKg' ? parseFloat(value) || 0 : value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const calculateTotalValue = () => {
    return inventoryService.calculateTotalValue(
      formData.quantity || 0, 
      formData.pricePerKg || 0, 
      formData.unit
    );
  };

  if (!hasPermission('stock.update')) {
    return null;
  }

  if (!hasPermission("stock.update")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to edit inventory items.</p>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory data...</p>
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
                <h1 className="text-lg font-semibold text-gray-900">Edit Inventory</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Update inventory record details</p>
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
              <p className="text-xs text-gray-500 mt-1">Update the details for this inventory item</p>
            </div>

            <div className="p-4 space-y-4">
              {/* Inventory Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Inventory Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.inventoryType}
                  onChange={(e) => handleInputChange(e)}
                  name="inventoryType"
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
                  value={formData.dateOfStock}
                  onChange={(e) => handleInputChange(e)}
                  name="dateOfStock"
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
                    value={formData.quantity?.toString().replace(/^0+(?=\d)/, "") || ""}
                    onChange={(e) => handleInputChange(e)}
                    name="quantity"
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
                    value={formData.unit}
                    onChange={(e) => handleInputChange(e)}
                    name="unit"
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
                  value={formData.godown}
                  onChange={(e) => handleInputChange(e)}
                  name="godown"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select Godown (Optional)</option>
                  {godowns.map((godown) => (
                    <option key={godown._id} value={godown._id}>
                      {godown?.name}
                      {godown?.location && ` - ${godown.location.city}, ${godown.location.state}`}
                    </option>
                  ))}
                </select>
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
                  value={formData.pricePerKg?.toString().replace(/^0+(?=\d)/, "") || ""}
                  onChange={(e) => handleInputChange(e)}
                  name="pricePerKg"
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
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange(e)}
                  name="additionalNotes"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Any additional notes or comments..."
                />
              </div>

              {/* Total Value Display */}
              {formData.quantity > 0 && formData.pricePerKg && formData.pricePerKg > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      Total Value: {inventoryService.formatTotalValue(formData.quantity, formData.pricePerKg, formData.unit)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Update Inventory
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

export default EditInventoryPage;