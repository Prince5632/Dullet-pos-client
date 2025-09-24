import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import type { OrderItem } from '../../types';

interface OrderItemEditorProps {
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
  disabled?: boolean;
}

const OrderItemEditor: React.FC<OrderItemEditorProps> = ({
  items,
  onChange,
  disabled = false,
}) => {
  const [localItems, setLocalItems] = useState<OrderItem[]>(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...localItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-calculate total amount when quantity or rate changes
    if (field === 'quantity' || field === 'ratePerUnit') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const rate = field === 'ratePerUnit' ? Number(value) : updatedItems[index].ratePerUnit;
      updatedItems[index].totalAmount = orderService.calculateItemTotal(quantity, rate);
    }

    setLocalItems(updatedItems);
    onChange(updatedItems);
  };

  const addItem = () => {
    const newItem: OrderItem = {
      productName: 'Wheat Flour',
      grade: '',
      quantity: 1,
      unit: 'KG',
      ratePerUnit: 0,
      totalAmount: 0,
      packaging: 'Standard',
    };

    const updatedItems = [...localItems, newItem];
    setLocalItems(updatedItems);
    onChange(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = localItems.filter((_, i) => i !== index);
    setLocalItems(updatedItems);
    onChange(updatedItems);
  };

  const calculateSubtotal = () => {
    return localItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
        {!disabled && (
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Item
          </button>
        )}
      </div>

      {localItems.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-400">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items added</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first order item.</p>
          {!disabled && (
            <div className="mt-6">
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Item
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {localItems.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">Item #{index + 1}</h4>
                {!disabled && localItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Remove item"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) => updateItem(index, 'productName', e.target.value)}
                    list={`product-suggestions-${index}`}
                    disabled={disabled}
                    placeholder="Enter product name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <datalist id={`product-suggestions-${index}`}>
                    {orderService.getProductNames().map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                {/* Grade (for Wheat Flour) */}
                {item.productName === 'Wheat Flour' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grade
                    </label>
                    <input
                      type="text"
                      value={item.grade || ''}
                      onChange={(e) => updateItem(index, 'grade', e.target.value)}
                      disabled={disabled}
                      placeholder="e.g., Grade A, Premium"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    disabled={disabled}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {orderService.getUnits().map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rate Per Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate per {item.unit} (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={item.ratePerUnit}
                    onChange={(e) => updateItem(index, 'ratePerUnit', Number(e.target.value))}
                    disabled={disabled}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Packaging */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Packaging
                  </label>
                  <select
                    value={item.packaging}
                    onChange={(e) => updateItem(index, 'packaging', e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {orderService.getPackagingOptions().map((packaging) => (
                      <option key={packaging} value={packaging}>
                        {packaging}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Item Total:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {orderService.formatCurrency(item.totalAmount || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Subtotal */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-base font-medium text-gray-700">Subtotal ({localItems.length} item{localItems.length !== 1 ? 's' : ''}):</span>
              <span className="text-xl font-bold text-blue-600">
                {orderService.formatCurrency(calculateSubtotal())}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderItemEditor;
