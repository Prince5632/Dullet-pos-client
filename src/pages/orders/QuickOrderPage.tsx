import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import CustomerSelector from '../../components/customers/CustomerSelector';
import type { QuickProduct, CreateQuickOrderForm, Customer } from '../../types';
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

      const payload: CreateQuickOrderForm = {
        customer: selectedCustomerId,
        items: itemsArray.map(it => ({
          productKey: it.product.key,
          packaging: it.packaging,
          ...(it.mode === 'bags' && it.product.bagSizeKg ? { bags: it.bags } : { quantityKg: it.quantityKg })
        })),
        paymentTerms,
        priority,
      };

      const created = await orderService.createQuickOrder(payload);
      toast.success('Order created');
      navigate(`/orders/${created._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/orders')} className="p-1 text-gray-600 hover:text-gray-900">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Quick Order</h1>
              <p className="text-sm text-gray-500">Create orders faster with pre-defined items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Customer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <CustomerSelector
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={handleCustomerChange}
            label="Customer"
            placeholder="Select or create a customer"
            required
            showDetails={false}
          />
        </div>

        {/* Products chips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Products</h3>
            {loadingProducts && <span className="text-xs text-gray-500">Loading...</span>}
            {productsError && <span className="text-xs text-red-600">{productsError}</span>}
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-2">
              {products.map(p => {
                const isSelected = !!selectedItems[p.key];
                return (
                  <button
                    key={p.key}
                    onClick={() => openQtyModal(p)}
                    className={`shrink-0 px-3 py-2 rounded-full border text-left transition-all ${isSelected ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    <div className="text-xs font-medium leading-tight">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      ₹{p.pricePerKg}/kg{p.bagSizeKg ? ` • ${p.bagSizeKg}kg bag` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected items */}
        {itemsArray.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-24">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Selected Items</h3>
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

        {/* Payment terms & priority */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-28">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <div className="flex gap-2">
                {(['Cash','Credit','Advance'] as const).map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setPaymentTerms(term)}
                    className={`px-3 py-2 rounded-lg text-sm border ${paymentTerms === term ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-lg font-semibold text-gray-900">{orderService.formatCurrency(totalAmount)}</div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            className={`flex-1 inline-flex items-center justify-center px-4 py-3 rounded-lg text-white text-sm font-medium shadow ${canSubmit ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            {creating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Order'
            )}
          </button>
        </div>
      </div>

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
