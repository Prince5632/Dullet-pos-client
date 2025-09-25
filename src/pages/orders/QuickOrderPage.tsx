import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import CustomerSelector from '../../components/customers/CustomerSelector';
import type { QuickProduct, CreateQuickOrderForm, Customer, Godown } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { toast } from 'react-hot-toast';

type ItemMode = 'bags' | 'kg';

type SelectedItem = {
  product: QuickProduct;
  mode: ItemMode;
  bags?: number;
  quantityKg?: number;
  packaging?: 'Standard' | 'Custom' | '5kg Bags' | '10kg Bags' | '25kg Bags' | '50kg Bags' | 'Loose';
};

const PACKAGING_OPTIONS: SelectedItem['packaging'][] = [
  '5kg Bags', '10kg Bags', '25kg Bags', '50kg Bags', 'Loose', 'Standard', 'Custom'
];

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
  const [qtyMode, setQtyMode] = useState<ItemMode>('bags');
  const [bags, setBags] = useState<number>(1);
  const [kg, setKg] = useState<number>(0);
  const [packaging, setPackaging] = useState<SelectedItem['packaging']>('Standard');

  // Other minimal fields
  const [paymentTerms, setPaymentTerms] = useState<'Cash' | 'Credit' | 'Advance'>('Cash');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [creating, setCreating] = useState(false);
  // Payment
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

  // Derived maps can be added here in future if needed

  const handleCustomerChange = (customerId: string, _customer: Customer | null) => {
    setSelectedCustomerId(customerId);
  };

  const openQtyModal = (product: QuickProduct) => {
    setActiveProduct(product);
    const existing = selectedItems[product.key];
    if (existing) {
      setQtyMode(existing.mode);
      setBags(existing.bags || 1);
      setKg(existing.quantityKg || 0);
      setPackaging(existing.packaging || product.defaultPackaging || 'Standard');
    } else {
      const defaultMode: ItemMode = product.bagSizeKg ? 'bags' : 'kg';
      setQtyMode(defaultMode);
      setBags(1);
      setKg(0);
      setPackaging(product.defaultPackaging || (product.bagSizeKg ? (product.bagSizeKg === 10 ? '10kg Bags' : product.bagSizeKg === 5 ? '5kg Bags' : 'Standard') : 'Loose'));
    }
  };

  const closeQtyModal = () => {
    setActiveProduct(null);
  };

  const confirmQty = () => {
    if (!activeProduct) return;
    if (qtyMode === 'bags') {
      if (!activeProduct.bagSizeKg) {
        toast.error('Bags option not available for this product');
        return;
      }
      if (!bags || bags <= 0) {
        toast.error('Enter valid number of bags');
        return;
      }
    } else {
      if (!kg || kg <= 0) {
        toast.error('Enter valid kilograms');
        return;
      }
    }

    const item: SelectedItem = {
      product: activeProduct,
      mode: qtyMode,
      bags: qtyMode === 'bags' ? bags : undefined,
      quantityKg: qtyMode === 'kg' ? kg : undefined,
      packaging: packaging || activeProduct.defaultPackaging || 'Standard',
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

  const adjustBags = (key: string, delta: number) => {
    setSelectedItems(prev => {
      const it = prev[key];
      if (!it || it.mode !== 'bags' || !it.product.bagSizeKg) return prev;
      const next = Math.max(0, (it.bags || 0) + delta);
      if (next === 0) {
        const clone = { ...prev };
        delete clone[key];
        return clone;
      }
      return { ...prev, [key]: { ...it, bags: next } };
    });
  };

  const computeItemKg = (it: SelectedItem) => {
    if (it.mode === 'bags' && it.product.bagSizeKg) return (it.bags || 0) * it.product.bagSizeKg;
    return it.quantityKg || 0;
  };

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

      const paymentStatus: 'pending' | 'partial' | 'paid' = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

      const payload: CreateQuickOrderForm = {
        customer: selectedCustomerId,
        items: itemsArray.map(it => ({
          productKey: it.product.key,
          packaging: it.packaging,
          ...(it.mode === 'bags' && it.product.bagSizeKg ? { bags: it.bags } : { quantityKg: it.quantityKg })
        })),
        paymentTerms,
        priority,
        paidAmount,
        paymentStatus,
        godown: selectedGodownId || undefined,
      };

      const created = await orderService.createQuickOrder(payload);
      // Fallback: if backend quick route doesn't persist payment yet, ensure it's updated now before navigating
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
      {/* Mobile-optimized Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => navigate('/orders')} 
              className="inline-flex items-center p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Quick Order</h1>
              <p className="hidden sm:block mt-1 text-sm text-gray-600">Create orders faster with pre-defined items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-screen-2xl mx-auto">
        {/* Customer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
            Godown
          </h3>
          <select
            value={selectedGodownId}
            onChange={(e) => setSelectedGodownId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select godown</option>
            {godowns.map(g => (
              <option key={g._id} value={g._id}>{g.name} ({g.location.city}{g.location.area ? ` - ${g.location.area}` : ''})</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">Defaults from your primary godown when available.</p>
        </div>

        {/* Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
              Products
            </h3>
            {loadingProducts && <span className="text-sm text-gray-500">Loading...</span>}
            {productsError && <span className="text-sm text-red-600">{productsError}</span>}
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
              <div key={category} className="mb-4 last:mb-0">
                {/* Compact category header */}
                <div className="flex items-center mb-3">
                  <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {category}
                  </span>
                  <div className="h-px bg-gray-200 flex-1 ml-3"></div>
                </div>
                
                {/* Compact product list */}
                <div className="space-y-2">
                  {baseProducts.map(({ baseName, variants }) => {
                    const hasSelectedVariant = variants.some(v => !!selectedItems[v.key]);
                    const selectedCount = variants.filter(v => !!selectedItems[v.key]).length;
                    
                    return (
                      <div
                        key={baseName}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          hasSelectedVariant 
                            ? 'bg-emerald-50 border-emerald-300' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {baseName}
                              </h4>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                ₹{variants[0].pricePerKg}/kg
                              </span>
                              {hasSelectedVariant && (
                                <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                                  {selectedCount} selected
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Package size buttons */}
                          <div className="flex gap-1 ml-3">
                            {variants.map(variant => {
                              const isSelected = !!selectedItems[variant.key];
                              return (
                                <button
                                  key={variant.key}
                                  onClick={() => openQtyModal(variant)}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700'
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
                          <div className="mt-2 pt-2 border-t border-emerald-200">
                            <div className="flex flex-wrap gap-1">
                              {variants.filter(v => !!selectedItems[v.key]).map(variant => {
                                const item = selectedItems[variant.key];
                                const kg = item.mode === 'bags' && variant.bagSizeKg 
                                  ? (item.bags || 0) * variant.bagSizeKg 
                                  : (item.quantityKg || 0);
                                
                                return (
                                  <span key={variant.key} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                                    {variant.bagSizeKg ? `${variant.bagSizeKg}kg` : 'Loose'}: {kg}kg
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
              Selected Items ({itemsArray.length})
            </h3>
            <div className="space-y-3">
              {itemsArray.map(it => {
                const kg = computeItemKg(it);
                const lineTotal = kg * it.product.pricePerKg;
                return (
                  <div key={it.product.key} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{it.product.name}</div>
                      <div className="text-xs text-gray-500">
                        {kg} kg • ₹{it.product.pricePerKg}/kg {it.mode === 'bags' && it.product.bagSizeKg ? `• ${it.bags} bag${(it.bags||0)>1?'s':''}` : ''}
                      </div>
                      {it.packaging && <div className="text-[11px] text-gray-400">Packaging: {it.packaging}</div>}
                    </div>

                    <div className="flex items-center gap-2">
                      {it.mode === 'bags' && it.product.bagSizeKg ? (
                        <div className="flex items-center">
                          <button onClick={() => adjustBags(it.product.key, -1)} className="p-1.5 rounded-md border hover:bg-gray-50">
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <span className="mx-2 text-sm font-medium w-6 text-center">{it.bags || 0}</span>
                          <button onClick={() => adjustBags(it.product.key, 1)} className="p-1.5 rounded-md border hover:bg-gray-50">
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => openQtyModal(it.product)} className="text-xs text-blue-600 underline">Edit</button>
                      )}

                      <div className="text-sm font-semibold text-gray-900 w-20 text-right">
                        {orderService.formatCurrency(lineTotal)}
                      </div>

                      <button onClick={() => removeItem(it.product.key)} className="p-1.5 rounded-md border hover:bg-gray-50">
                        <XMarkIcon className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment (with compact terms/priority) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-28">
          <div className="flex items-start sm:items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-medium text-gray-900">Payment</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Terms:</span>
                <div className="inline-flex gap-1">
                  {(['Cash','Credit','Advance'] as const).map(term => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setPaymentTerms(term)}
                      className={`px-2.5 py-1.5 rounded-md text-xs border ${paymentTerms === term ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Priority:</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <div className="text-sm text-gray-600">Remaining</div>
              <div className="text-lg font-semibold text-gray-900">{orderService.formatCurrency(Math.max(0, totalAmount - (paidAmount || 0)))}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaidAmount(totalAmount)}
                className="px-3 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 text-sm"
              >
                Mark as Paid
              </button>
              <button
                type="button"
                onClick={() => setPaidAmount(0)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 safe-area-inset-bottom">
        <div className="px-4 py-4 max-w-screen-2xl mx-auto w-full">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-1">Total Amount</div>
              <div className="text-lg font-semibold text-emerald-600 truncate">
                {orderService.formatCurrency(totalAmount)}
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={handleCreate}
                disabled={!canSubmit}
                className={`inline-flex items-center justify-center px-6 py-3 rounded-lg text-white text-sm font-medium shadow-sm transition-all duration-200 whitespace-nowrap ${
                  canSubmit 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
      <div className="h-20"></div>

      {/* Quantity Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold text-gray-900">{activeProduct.name}</h4>
              <button onClick={closeQtyModal} className="p-1 rounded hover:bg-gray-100">
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="text-xs text-gray-500 mb-4">₹{activeProduct.pricePerKg}/kg{activeProduct.bagSizeKg ? ` • ${activeProduct.bagSizeKg}kg bag` : ''}</div>

            {/* Mode toggle */}
            <div className="mb-3">
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setQtyMode('bags')}
                  disabled={!activeProduct.bagSizeKg}
                  className={`px-3 py-2 text-sm ${qtyMode==='bags' ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-gray-700'} ${!activeProduct.bagSizeKg ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Bags
                </button>
                <button
                  onClick={() => setQtyMode('kg')}
                  className={`px-3 py-2 text-sm ${qtyMode==='kg' ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-gray-700'}`}
                >
                  KG
                </button>
              </div>
            </div>

            {/* Inputs */}
            {qtyMode === 'bags' && activeProduct.bagSizeKg ? (
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setBags(Math.max(1, bags - 1))} className="p-2 rounded-md border hover:bg-gray-50">
                  <MinusIcon className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={bags}
                  min={1}
                  onChange={(e) => setBags(Math.max(1, Number(e.target.value)))}
                  className="w-20 text-center px-3 py-2 border rounded-lg"
                />
                <button onClick={() => setBags(bags + 1)} className="p-2 rounded-md border hover:bg-gray-50">
                  <PlusIcon className="h-4 w-4" />
                </button>
                <div className="text-sm text-gray-600">× {activeProduct.bagSizeKg}kg</div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Kilograms</label>
                <input
                  type="number"
                  value={kg}
                  min={0}
                  step={0.5}
                  onChange={(e) => setKg(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            {/* Packaging */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Packaging</label>
              <select
                value={packaging}
                onChange={(e) => setPackaging(e.target.value as SelectedItem['packaging'])}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {PACKAGING_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button onClick={closeQtyModal} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button onClick={confirmQty} className="px-4 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickOrderPage;
