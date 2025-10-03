import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import type { Customer, UpdateCustomerForm } from '../../types';

const EditCustomerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<UpdateCustomerForm>({});

  useEffect(() => {
    (async () => {
      if (!id) return;
      const data = await customerService.getCustomerById(id);
      setCustomer(data);
      setForm({
        businessName: data.businessName,
        contactPersonName: data.contactPersonName,
        phone: data.phone,
        address: data.address,
        customerType: data.customerType,
        notes: data.notes,
      });
    })();
  }, [id]);

  const update = (path: string, value: any) => {
    if (path.includes('.')) {
      const [p, c] = path.split('.');
      setForm(prev => ({ ...prev, [p]: { ...(prev as any)[p], [c]: value } }));
    } else {
      setForm(prev => ({ ...prev, [path]: value }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await customerService.updateCustomer(id, form);
      navigate(`/customers/${id}`);
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
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Edit Customer</h1>
        </div>
      </div>
      <form onSubmit={submit} className="px-3 sm:px-4 py-3 space-y-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="px-3 py-2 border rounded" placeholder="Business Name" value={form.businessName || ''} onChange={e => update('businessName', e.target.value)} />
          <input className="px-3 py-2 border rounded" placeholder="Contact Person Name" value={form.contactPersonName || ''} onChange={e => update('contactPersonName', e.target.value)} />
          <input className="px-3 py-2 border rounded" placeholder="Phone" value={form.phone || ''} onChange={e => update('phone', e.target.value)} />
          <select className="px-3 py-2 border rounded" value={form.customerType || ''} onChange={e => update('customerType', e.target.value)}>
            <option value="Retailer">Retailer</option>
            <option value="Distributor">Distributor</option>
            <option value="Wholesaler">Wholesaler</option>
          </select>
          <input className="px-3 py-2 border rounded" placeholder="Street" value={form.address?.street || ''} onChange={e => update('address.street', e.target.value)} />
          <input className="px-3 py-2 border rounded" placeholder="City" value={form.address?.city || ''} onChange={e => update('address.city', e.target.value)} />
          <input className="px-3 py-2 border rounded" placeholder="State" value={form.address?.state || ''} onChange={e => update('address.state', e.target.value)} />
          <input className="px-3 py-2 border rounded" placeholder="Pincode" value={form.address?.pincode || ''} onChange={e => update('address.pincode', e.target.value)} />
          <input className="px-3 py-2 border rounded sm:col-span-2" placeholder="Notes" value={form.notes || ''} onChange={e => update('notes', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(`/customers/${id}`)} className="px-3 py-2 border rounded text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};

export default EditCustomerPage;


