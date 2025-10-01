import React, { useState, useEffect } from 'react';
import { TruckIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import { userService } from '../../services/userService';
import { orderService } from '../../services/orderService';
import type { User, Order } from '../../types';
import { toast } from 'react-hot-toast';
import { resolveCapturedImageSrc } from '../../utils/image';

interface DriverAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onOrderUpdate: (updatedOrder: Order) => void;
}

const DriverAssignmentModal: React.FC<DriverAssignmentModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdate
}) => {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Load drivers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDrivers();
      setSearchTerm('');
      setSelectedDriverId('');
      setNotes('');
    }
  }, [isOpen]);

  // Filter drivers based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDrivers(drivers);
    } else {
      const filtered = drivers.filter(driver =>
        driver.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.phone.includes(searchTerm) ||
        driver.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDrivers(filtered);
    }
  }, [drivers, searchTerm]);

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true);
      // Get users with Driver role
      const response = await userService.getUsers({
        role: 'Driver',
        isActive: 'true',
        limit: 100 // Get more drivers at once
      });

      if (response.success && response.data) {
        setDrivers(response.data.users);
      }
    } catch (error) {
      console.error('Failed to load drivers:', error);
      toast.error('Failed to load drivers');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDriverId) {
      toast.error('Please select a driver');
      return;
    }

    try {
      setLoading(true);
      const updatedOrder = await orderService.assignDriver(order._id, selectedDriverId, notes);
      toast.success('Driver assigned successfully');
      onOrderUpdate(updatedOrder);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign driver';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const selectedDriver = drivers.find(d => d._id === selectedDriverId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Driver"
      size="lg"
    >
      <div className="space-y-6">
        {/* Order Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">Order Number:</span> {order.orderNumber}</p>
            <p><span className="font-medium">Customer:</span> {order.customer?.businessName}</p>
            <p><span className="font-medium">Amount:</span> ₹{order.totalAmount?.toLocaleString()}</p>
          </div>
        </div>

        {/* Driver Search */}
        <div>
          <label htmlFor="driver-search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Drivers
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="driver-search"
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search by name, phone, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Driver List */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Drivers
          </label>
          <div className="border border-gray-300 rounded-md max-h-60 overflow-y-auto">
            {loadingDrivers ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-500">Loading drivers...</span>
                </div>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="p-8 text-center">
                <TruckIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'No drivers match your search' : 'No drivers available'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredDrivers.map((driver) => (
                  <div
                    key={driver._id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedDriverId === driver._id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedDriverId(driver._id)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        checked={selectedDriverId === driver._id}
                        onChange={() => setSelectedDriverId(driver._id)}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex-shrink-0">
                          {driver.profilePhoto ? (
                            <img
                              className="h-8 w-8 rounded-full"
                              src={resolveCapturedImageSrc(driver?.profilePhoto)}
                              alt=""
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {driver.firstName} {driver.lastName}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{driver.phone}</span>
                            {driver.employeeId && <span>ID: {driver.employeeId}</span>}
                            <span className="capitalize">{driver.department}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Driver Info */}
        {selectedDriver && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Selected Driver</h4>
            <div className="text-sm text-blue-700">
              <p><span className="font-medium">Name:</span> {selectedDriver.firstName} {selectedDriver.lastName}</p>
              <p><span className="font-medium">Phone:</span> {selectedDriver.phone}</p>
              {selectedDriver.employeeId && (
                <p><span className="font-medium">Employee ID:</span> {selectedDriver.employeeId}</p>
              )}
              <p><span className="font-medium">Department:</span> {selectedDriver.department}</p>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="assignment-notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            id="assignment-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for the driver assignment..."
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={loading || !selectedDriverId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Assigning...
              </>
            ) : (
              'Assign Driver'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DriverAssignmentModal;
