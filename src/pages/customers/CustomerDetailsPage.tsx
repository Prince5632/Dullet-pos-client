import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { customerService } from '../../services/customerService';
import type { Customer } from '../../types';
import Avatar from '../../components/ui/Avatar';

const CustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const data = await customerService.getCustomerById(id);
        setCustomer(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">Customer not found</p>
          <button onClick={() => navigate('/customers')} className="px-3 py-2 rounded bg-blue-600 text-white">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar name={customer.businessName} size="sm" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{customer.businessName}</h1>
              <p className="text-xs text-gray-500">{customer.customerId}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/customers/${customer._id}/edit`} className="px-3 py-1.5 rounded border text-gray-700 bg-white hover:bg-gray-50">Edit</Link>
            <button onClick={() => navigate('/customers')} className="px-3 py-1.5 rounded bg-blue-600 text-white">Back</button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3 lg:col-span-2 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-500">Contact</div>
              <div className="text-gray-900">{customer.contactPersonName}</div>
              <div className="text-gray-900">{customer.phone}</div>
            </div>
            <div>
              <div className="text-gray-500">Type</div>
              <div className="text-gray-900">{customer.customerType}</div>
            </div>
            {customer.location && (
              <div className="col-span-2">
                <div className="text-gray-500">Location</div>
                <div className="text-gray-900">
                  <a
                    href={customer.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View on Google Maps
                  </a>
                </div>
              </div>
            )}
            <div className="col-span-2">
              <div className="text-gray-500">Address</div>
              <div className="text-gray-900">
                {[customer.address?.street, `${customer.address?.city}, ${customer.address?.state}`, customer.address?.pincode, customer.address?.country]
                  .filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
          {customer.notes && (
            <div className="text-sm">
              <div className="text-gray-500">Notes</div>
              <div className="text-gray-900">{customer.notes}</div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className="text-gray-900">₹{(customer.outstandingAmount || 0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Active</span><span className="text-gray-900">{customer.isActive ? 'Yes' : 'No'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-900">{new Date(customer.createdAt).toLocaleDateString()}</span></div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsPage;


