import React, { useState } from 'react';
import { CheckIcon, XMarkIcon, TruckIcon } from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../ui/Modal';
import DriverAssignmentModal from './DriverAssignmentModal';
import type { Order } from '../../types';
import { toast } from 'react-hot-toast';

interface OrderApprovalActionsProps {
  order: Order;
  onOrderUpdate: (updatedOrder: Order) => void;
  onAssignDriver?: () => void;
  className?: string;
}

type ApprovalAction = 'approve' | 'reject' | '';

interface ActionModalState {
  isOpen: boolean;
  action: ApprovalAction;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  variant: 'success' | 'danger';
}

const OrderApprovalActions: React.FC<OrderApprovalActionsProps> = ({
  order,
  onOrderUpdate,
  onAssignDriver,
  className = ''
}) => {
  const { hasPermission, hasOrderManageAccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [modalState, setModalState] = useState<ActionModalState>({
    isOpen: false,
    action: '',
    title: '',
    description: '',
    icon: CheckIcon,
    variant: 'success'
  });

  const canApprove = hasPermission('orders.approve');
  const canAssignDriver = hasOrderManageAccess();

  const openModal = (action: ApprovalAction, config: Omit<ActionModalState, 'isOpen' | 'action'>) => {
    setModalState({
      isOpen: true,
      action,
      ...config
    });
    setNotes('');
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    setNotes('');
  };

  const handleAction = async () => {
    if (!modalState.action) return;

    setLoading(true);
    try {
      const updatedOrder =
        modalState.action === 'approve'
          ? await orderService.approveOrder(order._id, notes)
          : await orderService.rejectOrder(order._id, notes);

      toast.success(`Order ${modalState.action === 'approve' ? 'approved' : 'rejected'} successfully`);

      onOrderUpdate(updatedOrder);
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableActions = () => {
    const actions: Array<{
      key: string;
      label: string;
      icon: React.ComponentType<any>;
      className: string;
      onClick: () => void;
    }> = [];

    if (order.status === 'pending' && canApprove) {
      actions.push(
        {
          key: 'approve',
          label: 'Approve',
          icon: CheckIcon,
          className: 'bg-green-600 hover:bg-green-700 text-white',
          onClick: () =>
            openModal('approve', {
              title: 'Approve Order',
              description: 'Approve this order so it can move forward with driver assignment.',
              icon: CheckIcon,
              variant: 'success'
            })
        },
        {
          key: 'reject',
          label: 'Reject',
          icon: XMarkIcon,
          className: 'bg-red-600 hover:bg-red-700 text-white',
          onClick: () =>
            openModal('reject', {
              title: 'Reject Order',
              description: 'Reject this order and include a brief reason.',
              icon: XMarkIcon,
              variant: 'danger'
            })
        }
      );
    }

    if (order.status === 'approved' && canAssignDriver) {
      const driverAssigned = !!order.driverAssignment?.driver;
      actions.push({
        key: 'assignDriver',
        label: driverAssigned ? 'Driver Assigned' : 'Assign Driver',
        icon: TruckIcon,
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
        onClick: () => {
          if (driverAssigned) {
            toast.error('Driver already assigned. Manage assignments in order details.');
          } else if (onAssignDriver) {
            onAssignDriver();
          } else {
            setDriverModalOpen(true);
          }
        }
      });
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        {availableActions.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${action.className}`}
          >
            <action.icon className="h-4 w-4 mr-1" />
            {action.label}
          </button>
        ))}
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 ${
              modalState.variant === 'success' ? 'text-green-600' :
              modalState.variant === 'danger' ? 'text-red-600' :
              'text-blue-600'
            }`}>
              <modalState.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {modalState.description}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="action-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes {modalState.action === 'reject' ? '(Required)' : '(Optional)'}
            </label>
            <textarea
              id="action-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Add notes for ${modalState.action}...`}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required={modalState.action === 'reject'}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAction}
              disabled={loading || (modalState.action === 'reject' && !notes.trim())}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                modalState.variant === 'success' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                modalState.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>

      <DriverAssignmentModal
        isOpen={driverModalOpen}
        onClose={() => setDriverModalOpen(false)}
        order={order}
        onOrderUpdate={onOrderUpdate}
      />
    </>
  );
};

export default OrderApprovalActions;
