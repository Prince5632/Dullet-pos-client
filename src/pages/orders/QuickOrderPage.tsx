import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import CustomerSelector from '../../components/customers/CustomerSelector';
import type { QuickProduct, CreateQuickOrderForm, Customer, Godown } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { toast } from 'react-hot-toast';

type ItemMode = 'kg';

type SelectedItem = {
  product: QuickProduct;
  mode: ItemMode;
  bags?: number;
  quantityKg?: number;
  packaging?: 'Standard' | 'Custom' | '5kg Bags' | '10kg Bags' | '25kg Bags' | '50kg Bags' | 'Loose';
};

// Helper function to format currency in full digits
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

// Alternative helper for just number formatting with commas
const formatNumber = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

const QuickOrderPage: React.FC = () => {
  const navigate = useNavigate();

  // Customers
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Products
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Selections
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});

  // Modal state for quantity entry
  const [activeProduct, setActiveProduct] = useState<QuickProduct | null>(null);
  const [kg, setKg] = useState<number>(0);

  // Other minimal fields
  const [paymentTerms, setPaymentTerms] = useState<'Cash' | 'Credit' | 'Advance'>('Cash');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [creating, setCreating] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  
  // Godown
  const { user } = useAuth();
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedGodownId, setSelectedGodownId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProducts(true);
        const list = await orderService.getQuickProducts();
        setProducts(list);
        setProductsError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load products';
        setProductsError(msg);
      } finally {
        setLoadingProducts(false);
      }
    };
    load();
  }, []);

  // Load godowns and default from user primary
  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get<{ godowns: Godown[] }>(API_CONFIG.ENDPOINTS.GODOWNS);
        if (res.success && res.data) {
          setGodowns(res.data.godowns);
          const defaultId = (user as any)?.primaryGodown?._id;
          if (defaultId) setSelectedGodownId(defaultId);
        }
      } catch {}
    })();
  }, [user]);

  const handleCustomerChange = (customerId: string, _customer: Customer | null) => {
    setSelectedCustomerId(customerId);
  };

  const openQtyModal = (product: QuickProduct) => {
    setActiveProduct(product);
    const existing = selectedItems[product.key];
    if (existing) {
      setKg(existing.quantityKg || 0);
    } else {
      setKg(0);
    }
  };

  const closeQtyModal = () => {
    setActiveProduct(null);
  };

  const confirmQty = () => {
    if (!activeProduct) return;
    if (!kg || kg <= 0) {
      toast.error('Enter valid kilograms');
      return;
    }

    const item: SelectedItem = {
      product: activeProduct,
      mode: 'kg',
      quantityKg: kg,
      packaging: 'Loose',
    };
    setSelectedItems(prev => ({ ...prev, [activeProduct.key]: item }));
    setActiveProduct(null);
  };

  const removeItem = (key: string) => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const computeItemKg = (it: SelectedItem) => it.quantityKg || 0;

  const itemsArray = useMemo(() => Object.values(selectedItems), [selectedItems]);
  const totalAmount = useMemo(() => {
    return itemsArray.reduce((sum, it) => sum + computeItemKg(it) * it.product.pricePerKg, 0);
  }, [itemsArray]);

  const canSubmit = selectedCustomerId && itemsArray.length > 0 && !creating;

  const handleCreate = async () => {
    try {
      if (!selectedCustomerId) {
        toast.error('Select a customer');
        return;
      }
      if (itemsArray.length === 0) {
        toast.error('Add at least one item');
        return;
      }
      setCreating(true);

      const paymentStatus: 'pending' | 'partial' | 'paid' = paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');

      const payload: CreateQuickOrderForm = {
        customer: selectedCustomerId,
        items: itemsArray.map(it => ({
          productKey: it.product.key,
          packaging: it.packaging,
          quantityKg: it.quantityKg
        })),
        paymentTerms,
        priority,
        paidAmount,
        paymentStatus,
        godown: selectedGodownId || undefined,
      };

      const created = await orderService.createQuickOrder(payload);
      try {
        if (paidAmount > 0) {
          await orderService.updateOrder(created._id, { paidAmount, paymentStatus });
        }
      } catch {
        // ignore, navigation will still proceed
      }
      toast.success('Order created');
      navigate(`/orders/${created._id}` , { state: { justCreatedPayment: { paidAmount, paymentStatus } } } as any);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => navigate('/orders')} 
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Quick Order</h1>
              <p className="hidden sm:block text-xs text-gray-600">Fast ordering with presets</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        {/* Customer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
            Customer
          </h3>
          <CustomerSelector
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={handleCustomerChange}
            label="Customer"
            placeholder="Select or create a customer"
            required
            showDetails={false}
          />
        </div>

        {/* Godown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
            Godown
          </h3>
          <select
            value={selectedGodownId}
            onChange={(e) => setSelectedGodownId(e.target.value)}
            className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select godown</option>
            {godowns.map(g => (
              <option key={g._id} value={g._id}>{g.name} - {g.location.city}</option>
            ))}
          </select>
          <p className="text-[10px] text-gray-500 mt-1.5">Auto-selected from your godown</p>
        </div>

        {/* Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
              Products
            </h3>
            {loadingProducts && <span className="text-xs text-gray-500">Loading...</span>}
            {productsError && <span className="text-xs text-red-600">{productsError}</span>}
          </div>

          {/* Compact grouped products */}
          {(() => {
            // Group products by their base name (removing size info)
            const baseProductGroups = products.reduce((groups, product) => {
              let baseName = product.name
                .replace(/\d+\s*kg\s*/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (!groups[baseName]) {
                groups[baseName] = [];
              }
              groups[baseName].push(product);
              return groups;
            }, {} as Record<string, typeof products>);

            // Categorize the base products
            const categorizedProducts = Object.entries(baseProductGroups).reduce((categories, [baseName, variants]) => {
              let category = 'Other';
              
              if (baseName.toLowerCase().includes('chakki') && baseName.toLowerCase().includes('atta')) {
                category = 'Chakki Fresh Atta';
              } else if (baseName.toLowerCase().includes('wheat') && !baseName.toLowerCase().includes('chakki')) {
                category = 'Wheat Products';
              } else if (baseName.toLowerCase().includes('flour')) {
                category = 'Flour Products';
              }
              
              if (!categories[category]) {
                categories[category] = [];
              }
              categories[category].push({ baseName, variants });
              return categories;
            }, {} as Record<string, Array<{ baseName: string; variants: typeof products }>>);

            return Object.entries(categorizedProducts).map(([category, baseProducts]) => (
              <div key={category} className="mb-3 last:mb-0">
                {/* Compact category header */}
                <div className="flex items-center mb-2">
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {category}
                  </span>
                  <div className="h-px bg-gray-200 flex-1 ml-2"></div>
                </div>
                
                {/* Compact product list */}
                <div className="space-y-1.5">
                  {baseProducts.map(({ baseName, variants }) => {
                    const hasSelectedVariant = variants.some(v => !!selectedItems[v.key]);
                    const selectedCount = variants.filter(v => !!selectedItems[v.key]).length;
                    
                    return (
                      <div
                        key={baseName}
                        className={`p-2.5 rounded-lg border transition-all duration-200 ${
                          hasSelectedVariant 
                            ? 'bg-emerald-50 border-emerald-300' 
                            : 'bg-white border-gray-200 hover:border-gray-300 active:scale-[0.98]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-semibold text-gray-900 truncate">
                                {baseName}
                              </h4>
                              <span className="text-[10px] text-gray-500 flex-shrink-0">
                                ₹{formatNumber(variants[0].pricePerKg)}/kg
                              </span>
                              {hasSelectedVariant && (
                                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  {selectedCount}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Package size buttons */}
                          <div className="flex gap-1 ml-2">
                            {variants.map(variant => {
                              const isSelected = !!selectedItems[variant.key];
                              return (
                                <button
                                  key={variant.key}
                                  onClick={() => openQtyModal(variant)}
                                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700 active:scale-95'
                                  }`}
                                >
                                  {variant.bagSizeKg ? `${variant.bagSizeKg}kg` : 'Loose'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Show selected quantities inline */}
                        {hasSelectedVariant && (
                          <div className="mt-1.5 pt-1.5 border-t border-emerald-200">
                            <div className="flex flex-wrap gap-1">
                              {variants.filter(v => !!selectedItems[v.key]).map(variant => {
                                const item = selectedItems[variant.key];
                                const kg = item.quantityKg || 0;
                                
                                return (
                                  <span key={variant.key} className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                                    {kg}kg
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Selected items */}
        {itemsArray.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
              Cart ({itemsArray.length})
            </h3>
            <div className="space-y-2">
              {itemsArray.map(it => {
                const kg = computeItemKg(it);
                const lineTotal = kg * it.product.pricePerKg;
                return (
                  <div key={it.product.key} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">{it.product.name}</div>
                      <div className="text-[10px] text-gray-500">
                        {kg}kg • ₹{formatNumber(it.product.pricePerKg)}/kg
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openQtyModal(it.product)} className="text-[10px] text-blue-600 underline">Edit</button>

                      <div className="text-xs font-semibold text-gray-900 w-20 text-right">
                        ₹{formatNumber(lineTotal)}
                      </div>

                      <button onClick={() => removeItem(it.product.key)} className="p-1 rounded-md border hover:bg-gray-50 active:scale-95">
                        <XMarkIcon className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment (with compact terms/priority) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
              Payment
            </h3>
            <div className="flex items-center gap-2">
              <div className="inline-flex gap-0.5">
                {(['Cash','Credit','Advance'] as const).map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setPaymentTerms(term)}
                    className={`px-2 py-1 rounded text-[10px] border ${paymentTerms === term ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 active:scale-95'}`}
                  >
                    {term}
                  </button>
                ))}
              </div>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="px-1.5 py-1 border border-gray-300 rounded text-[10px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:items-end">
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-1">Paid Amount</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-1">Remaining</div>
              <div className="text-sm font-semibold text-gray-900">
                ₹{formatNumber(Math.max(0, totalAmount - (paidAmount || 0)))}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => setPaidAmount(totalAmount)}
              className="flex-1 px-2 py-1.5 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 text-[10px] active:scale-95"
            >
              Mark Paid
            </button>
            <button
              type="button"
              onClick={() => setPaidAmount(0)}
              className="flex-1 px-2 py-1.5 rounded-lg border border-gray-300 text-[10px] hover:bg-gray-50 active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-inset-bottom shadow-lg">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gray-500 mb-0.5">Total Amount</div>
              <div className="text-base font-bold text-emerald-600 truncate">
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={handleCreate}
                disabled={!canSubmit}
                className={`inline-flex items-center justify-center px-5 py-2 rounded-lg text-white text-xs font-medium shadow-sm transition-all duration-200 whitespace-nowrap active:scale-95 ${
                  canSubmit 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {creating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  'Create Order'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Padding */}
      <div className="h-16"></div>

      {/* Quantity Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-sm font-semibold text-gray-900">{activeProduct.name}</h4>
              <button onClick={closeQtyModal} className="p-1 rounded hover:bg-gray-100 active:scale-95">
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="text-[10px] text-gray-500 mb-3">₹{formatNumber(activeProduct.pricePerKg)}/kg{activeProduct.bagSizeKg ? ` • ${activeProduct.bagSizeKg}kg bag` : ''}</div>

            {/* Inputs */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Kilograms</label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setKg(Math.max(0, kg - 1))}
                  disabled={kg <= 0}
                  className="px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-medium active:scale-95"
                >
                  -
                </button>
                <input
                  type="number"
                  value={kg === 0 ? '' : kg}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setKg(0);
                    } else {
                      const num = Math.max(0, Number(value));
                      setKg(num);
                    }
                  }}
                  onFocus={(e) => {
                    if (e.target.value === '0') {
                      e.target.select();
                    }
                  }}
                  min={0}
                  step={0.5}
                  placeholder="0"
                  className="flex-1 px-3 py-2 border-t border-b border-gray-300 text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setKg(kg + 1)}
                  className="px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-medium active:scale-95"
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                {[5, 10, 25, 50].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setKg(preset)}
                    className="flex-1 px-2 py-1 text-[10px] border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-600 active:scale-95"
                  >
                    {preset}kg
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button onClick={closeQtyModal} className="px-3 py-1.5 rounded-lg border text-xs active:scale-95">Cancel</button>
              <button onClick={confirmQty} className="px-4 py-1.5 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 text-xs active:scale-95">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickOrderPage;
