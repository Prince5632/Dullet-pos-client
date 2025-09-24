import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { orderService } from '../../services/orderService';
import type { Order, OrderItem, UpdateOrderForm, QuickProduct } from '../../types';
import { toast } from 'react-hot-toast';

const schema = yup.object({
  paymentTerms: yup.mixed<'Cash' | 'Credit' | 'Advance'>().oneOf(['Cash', 'Credit', 'Advance']).required(),
  priority: yup.mixed<'low' | 'normal' | 'high' | 'urgent'>().oneOf(['low', 'normal', 'high', 'urgent']).optional(),
  requiredDate: yup.string().optional(),
  discountPercentage: yup.number().min(0).max(100).optional(),
  discount: yup.number().min(0).optional(),
  taxAmount: yup.number().min(0).optional(),
  deliveryInstructions: yup.string().optional(),
  notes: yup.string().optional(),
});

type ItemMode = 'bags' | 'kg';

const PACKAGING_OPTIONS: OrderItem['packaging'][] = [
  '5kg Bags', '10kg Bags', '25kg Bags', '50kg Bags', 'Loose', 'Standard', 'Custom'
];

const EditOrderPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  // Quick products
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  // Modal state (add/edit)
  const [activeProduct, setActiveProduct] = useState<QuickProduct | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<ItemMode>('bags');
  const [bags, setBags] = useState<number>(1);
  const [kg, setKg] = useState<number>(0);
  const [packaging, setPackaging] = useState<OrderItem['packaging']>('Standard');
  const [ratePerUnit, setRatePerUnit] = useState<number>(0);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UpdateOrderForm>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      paymentTerms: 'Cash',
      priority: 'normal',
      discountPercentage: 0,
      discount: 0,
      taxAmount: 0,
    }
  });

  const watched = watch();

  useEffect(() => {
    const load = async () => {
      if (!orderId) return;
      try {
        setLoading(true);
        const data = await orderService.getOrderById(orderId);
        setOrder(data);
        setItems(data.items || []);
        // Prefill form values
        setValue('paymentTerms', data.paymentTerms);
        setValue('priority', data.priority);
        if (data.requiredDate) setValue('requiredDate', data.requiredDate);
        if (typeof data.discountPercentage === 'number') setValue('discountPercentage', data.discountPercentage);
        if (typeof data.discount === 'number') setValue('discount', data.discount);
        if (typeof data.taxAmount === 'number') setValue('taxAmount', data.taxAmount);
        if (data.deliveryInstructions) setValue('deliveryInstructions', data.deliveryInstructions);
        if (data.notes) setValue('notes', data.notes);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load order');
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId, navigate, setValue]);

  // Load quick products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const list = await orderService.getQuickProducts();
        setProducts(list);
        setProductsError(null);
      } catch (e) {
        setProductsError(e instanceof Error ? e.message : 'Failed to load products');
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  const subtotal = useMemo(() => orderService.calculateSubtotal(items.map(i => ({ totalAmount: i.totalAmount || 0 } as any))), [items]);
  const total = useMemo(() => orderService.calculateTotal(subtotal, watched.discount || 0, watched.discountPercentage || 0, watched.taxAmount || 0), [subtotal, watched.discount, watched.discountPercentage, watched.taxAmount]);

  // Open add modal for quick product
  const openAddProduct = (p: QuickProduct) => {
    setActiveProduct(p);
    setEditingIndex(null);
    const defaultMode: ItemMode = p.bagSizeKg ? 'bags' : 'kg';
    setMode(defaultMode);
    setBags(1);
    setKg(0);
    setPackaging(p.defaultPackaging || (p.bagSizeKg ? (p.bagSizeKg === 10 ? '10kg Bags' : p.bagSizeKg === 5 ? '5kg Bags' : 'Standard') : 'Loose'));
    setRatePerUnit(p.pricePerKg);
  };

  // Open edit modal for existing item
  const openEditItem = (index: number) => {
    const it = items[index];
    setEditingIndex(index);
    setActiveProduct(null);
    const prod = products.find(p => p.name === it.productName);
    if (prod && prod.bagSizeKg) {
      setMode('bags');
      setBags(Math.max(1, Math.round((it.quantity || 0) / prod.bagSizeKg)));
    } else {
      setMode('kg');
      setKg(it.quantity || 0);
    }
    setPackaging(it.packaging || 'Standard');
    setRatePerUnit(it.ratePerUnit || 0);
  };

  const closeModal = () => {
    setActiveProduct(null);
    setEditingIndex(null);
  };

  const confirmModal = () => {
    if (activeProduct) {
      // Add/update quick product item
      const quantityKg = mode === 'bags' && activeProduct.bagSizeKg ? (bags > 0 ? bags * activeProduct.bagSizeKg : 0) : (kg > 0 ? kg : 0);
      if (!quantityKg) {
        toast.error('Enter a valid quantity');
        return;
      }
      const newItem: OrderItem = {
        productName: activeProduct.name,
        grade: '',
        quantity: quantityKg,
        unit: 'KG',
        ratePerUnit: activeProduct.pricePerKg,
        totalAmount: quantityKg * activeProduct.pricePerKg,
        packaging: packaging || activeProduct.defaultPackaging || 'Standard',
      };
      setItems(prev => {
        // If existing same productName, replace it
        const idx = prev.findIndex(i => i.productName === activeProduct.name);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = newItem;
          return copy;
        }
        return [...prev, newItem];
      });
      closeModal();
      return;
    }

    if (editingIndex !== null) {
      const it = items[editingIndex];
      const prod = products.find(p => p.name === it.productName);
      let quantityKg = it.quantity || 0;
      if (mode === 'bags' && prod?.bagSizeKg) {
        quantityKg = Math.max(0, bags) * prod.bagSizeKg;
      } else if (mode === 'kg') {
        quantityKg = Math.max(0, kg);
      }
      const rate = Number(ratePerUnit) || 0;
      const updated: OrderItem = {
        ...it,
        quantity: quantityKg,
        unit: 'KG',
        packaging: packaging || it.packaging,
        ratePerUnit: rate,
        totalAmount: quantityKg * rate,
      };
      setItems(prev => prev.map((p, i) => i === editingIndex ? updated : p));
      closeModal();
    }
  };

  const onSubmit = async (data: UpdateOrderForm) => {
    try {
      if (!order) return;
      setSaving(true);

      if (items.length === 0) {
        toast.error('Please add at least one item');
        return;
      }

      const itemErrors = items.flatMap((it, idx) => orderService.validateOrderItem(it).map(e => `Item ${idx + 1}: ${e}`));
      if (itemErrors.length > 0) {
        toast.error(itemErrors[0]);
        return;
      }

      // Determine payment status from paid amount if provided
      const effectiveTotal = total;
      let paymentStatus: Order['paymentStatus'] | undefined = undefined;
      if (typeof data.paidAmount === 'number') {
        if (data.paidAmount >= effectiveTotal) paymentStatus = 'paid';
        else if (data.paidAmount > 0) paymentStatus = 'partial';
        else paymentStatus = 'pending';
      }

      const payload: UpdateOrderForm = {
        ...data,
        items,
        ...(paymentStatus ? { paymentStatus } : {}),
      };

      const updated = await orderService.updateOrder(order._id, payload);
      toast.success('Order updated');
      navigate(`/orders/${updated._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/orders/${order._id}`)} className="p-1 text-gray-600 hover:text-gray-900">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Edit Order {order.orderNumber}</h1>
              <p className="text-sm text-gray-500">Update items and order details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit(onSubmit as any)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main - Quick style */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Add Products</h3>
                {loadingProducts && <span className="text-xs text-gray-500">Loading...</span>}
                {productsError && <span className="text-xs text-red-600">{productsError}</span>}
              </div>
              <div className="overflow-x-auto -mx-2 px-2">
                <div className="flex gap-2">
                  {products.map(p => (
                    <button key={p.key} type="button" onClick={() => openAddProduct(p)} className="shrink-0 px-3 py-2 rounded-full border bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
                      <div className="text-xs font-medium leading-tight">{p.name}</div>
                      <div className="text-[11px] text-gray-500">₹{p.pricePerKg}/kg{p.bagSizeKg ? ` • ${p.bagSizeKg}kg bag` : ''}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Items</h3>
              {items.length === 0 ? (
                <div className="text-sm text-gray-500">No items yet. Use the chips above to add products.</div>
              ) : (
                <div className="space-y-3">
                  {items.map((it, idx) => {
                    const prod = products.find(p => p.name === it.productName);
                    const kgQty = it.unit === 'KG' ? it.quantity : it.quantity; // simplify
                    const lineTotal = (it.ratePerUnit || 0) * (it.quantity || 0);
                    return (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{it.productName}</div>
                          <div className="text-xs text-gray-500">
                            {kgQty} kg • ₹{it.ratePerUnit}/kg {prod?.bagSizeKg ? `• ~${Math.round((it.quantity || 0) / prod.bagSizeKg)} bag${Math.round((it.quantity||0)/prod.bagSizeKg)!==1?'s':''}` : ''}
                          </div>
                          {it.packaging && <div className="text-[11px] text-gray-400">Packaging: {it.packaging}</div>}
                          <button type="button" onClick={() => openEditItem(idx)} className="text-xs text-blue-600 underline mt-1">Edit</button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center text-sm">
                            <span className="text-gray-500 mr-1">Rate</span>
                            <input
                              type="number"
                              value={it.ratePerUnit}
                              min={0}
                              step={0.5}
                              onChange={(e) => {
                                const rate = Number(e.target.value) || 0;
                                setItems(prev => prev.map((p, i) => i === idx ? { ...p, ratePerUnit: rate, totalAmount: rate * (p.quantity || 0) } : p));
                              }}
                              className="w-20 px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          <div className="text-sm font-semibold text-gray-900 w-20 text-right">{orderService.formatCurrency(lineTotal)}</div>
                          <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 rounded-md border hover:bg-gray-50">
                            <XMarkIcon className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select {...register('paymentTerms')} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500">
                    {orderService.getPaymentTerms().map(term => (<option key={term} value={term}>{term}</option>))}
                  </select>
                  {errors.paymentTerms && (<p className="mt-1 text-sm text-red-600">{errors.paymentTerms.message as any}</p>)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select {...register('priority')} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500">
                    {orderService.getPriorityOptions().map(p => (<option key={p.value} value={p.value}>{p.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Date</label>
                  <input type="date" {...register('requiredDate')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Instructions</label>
                  <input type="text" placeholder="Optional" {...register('deliveryInstructions')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={3} {...register('notes')} placeholder="Optional notes" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium">{orderService.formatCurrency(subtotal)}</span></div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="number" {...register('discountPercentage')} placeholder="0" min="0" max="100" step="0.01" className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
                      <span className="text-sm text-gray-600">% discount</span>
                    </div>
                    <div className="text-xs text-gray-500">Or fixed amount: ₹<input type="number" {...register('discount')} placeholder="0" min="0" step="0.01" className="w-20 px-2 py-1 border border-gray-300 rounded text-xs ml-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" /></div>
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Tax Amount</span><div className="flex items-center space-x-1"><span>₹</span><input type="number" {...register('taxAmount')} placeholder="0" min="0" step="0.01" className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" /></div></div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-lg font-semibold"><span>Total Amount</span><span className="text-emerald-600">{orderService.formatCurrency(total)}</span></div>
                </div>
              </div>

              {/* Payment Section */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Payment</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Paid</span><input type="number" step="0.01" min={0} defaultValue={order.paidAmount || 0} {...register('paidAmount')} className="w-28 px-2 py-1 border rounded text-right" /></div>
                  <div className="flex justify-between"><span className="text-gray-600">Remaining</span><span className="font-medium">{orderService.formatCurrency(Math.max(0, total - (Number((watched as any).paidAmount ?? order.paidAmount ?? 0))))}</span></div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setValue('paidAmount', total)} className="px-3 py-1.5 rounded-md text-white bg-emerald-600 hover:bg-emerald-700">Mark as Paid</button>
                    <button type="button" onClick={() => setValue('paidAmount', 0)} className="px-3 py-1.5 rounded-md border">Clear</button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button type="submit" disabled={saving || items.length === 0} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Saving...</>) : ('Save Changes')}
                </button>
                <button type="button" onClick={() => navigate(`/orders/${order._id}`)} className="w-full py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">Cancel</button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Quantity / Edit Modal */}
      {(activeProduct || editingIndex !== null) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold text-gray-900">{activeProduct ? activeProduct.name : items[editingIndex as number]?.productName}</h4>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100"><XMarkIcon className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="text-xs text-gray-500 mb-4">{activeProduct ? `₹${activeProduct.pricePerKg}/kg${activeProduct.bagSizeKg ? ` • ${activeProduct.bagSizeKg}kg bag` : ''}` : 'Edit item'}</div>

            {/* Mode toggle */}
            <div className="mb-3">
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                <button onClick={() => setMode('bags')} disabled={!(activeProduct?.bagSizeKg || products.find(p => p.name === items[editingIndex as number]?.productName)?.bagSizeKg)} className={`px-3 py-2 text-sm ${mode==='bags' ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-gray-700'} ${!(activeProduct?.bagSizeKg || products.find(p => p.name === items[editingIndex as number]?.productName)?.bagSizeKg) ? 'opacity-50 cursor-not-allowed' : ''}`}>Bags</button>
                <button onClick={() => setMode('kg')} className={`px-3 py-2 text-sm ${mode==='kg' ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-gray-700'}`}>KG</button>
              </div>
            </div>

            {/* Inputs */}
            {mode === 'bags' && (activeProduct?.bagSizeKg || products.find(p => p.name === items[editingIndex as number]?.productName)?.bagSizeKg) ? (
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setBags(Math.max(1, bags - 1))} className="p-2 rounded-md border hover:bg-gray-50"><MinusIcon className="h-4 w-4" /></button>
                <input type="number" value={bags} min={1} onChange={(e) => setBags(Math.max(1, Number(e.target.value)))} className="w-20 text-center px-3 py-2 border rounded-lg" />
                <button onClick={() => setBags(bags + 1)} className="p-2 rounded-md border hover:bg-gray-50"><PlusIcon className="h-4 w-4" /></button>
                <div className="text-sm text-gray-600">× {(activeProduct?.bagSizeKg || products.find(p => p.name === items[editingIndex as number]?.productName)?.bagSizeKg) || 0}kg</div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Kilograms</label>
                <input type="number" value={kg} min={0} step={0.5} onChange={(e) => setKg(Math.max(0, Number(e.target.value)))} placeholder="0" className="w-full px-3 py-2 border rounded-lg" />
              </div>
            )}

            {/* Rate (editing existing or custom) */}
            {editingIndex !== null && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate per kg</label>
                <input type="number" value={ratePerUnit} min={0} step={0.5} onChange={(e) => setRatePerUnit(Number(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            )}

            {/* Packaging */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Packaging</label>
              <select value={packaging} onChange={(e) => setPackaging(e.target.value as OrderItem['packaging'])} className="w-full px-3 py-2 border rounded-lg">
                {PACKAGING_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border" type="button">Cancel</button>
              <button onClick={confirmModal} className="px-4 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700" type="button">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditOrderPage;
