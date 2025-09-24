import React, { useState } from 'react';
import { 
  CheckIcon, 
  XMarkIcon, 
  PlayIcon,
  ClockIcon,
  TruckIcon,
  CheckCircleIcon,
  BanknotesIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../ui/Modal';
import type { Order } from '../../types';
import { toast } from 'react-hot-toast';

interface OrderApprovalActionsProps {
  order: Order;
  onOrderUpdate: (updatedOrder: Order) => void;
  className?: string;
}

interface ActionModalState {
  isOpen: boolean;
  action: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  variant: 'success' | 'danger' | 'primary';
}

const OrderApprovalActions: React.FC<OrderApprovalActionsProps> = ({
  order,
  onOrderUpdate,
  className = ''
}) => {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [modalState, setModalState] = useState<ActionModalState>({
    isOpen: false,
    action: '',
    title: '',
    description: '',
    icon: CheckIcon,
    variant: 'primary'
  });

  const canApprove = hasPermission('orders.approve');
  const canUpdate = hasPermission('orders.update');

  const openModal = (action: string, config: Omit<ActionModalState, 'isOpen' | 'action'>) => {
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
      let updatedOrder: Order;

      switch (modalState.action) {
        case 'approve':
          updatedOrder = await orderService.approveOrder(order._id, notes);
          toast.success('Order approved successfully');
          break;
        case 'reject':
          updatedOrder = await orderService.rejectOrder(order._id, notes);
          toast.success('Order rejected');
          break;
        case 'production':
          updatedOrder = await orderService.moveToProduction(order._id, notes);
          toast.success('Order moved to production');
          break;
        case 'ready':
          updatedOrder = await orderService.markAsReady(order._id, notes);
          toast.success('Order marked as ready');
          break;
        case 'dispatch':
          updatedOrder = await orderService.dispatchOrder(order._id, notes);
          toast.success('Order dispatched');
          break;
        case 'delivered':
          updatedOrder = await orderService.markAsDelivered(order._id, notes);
          toast.success('Order marked as delivered');
          break;
        case 'complete':
          updatedOrder = await orderService.completeOrder(order._id, notes);
          toast.success('Order completed');
          break;
        case 'cancel':
          updatedOrder = await orderService.cancelOrder(order._id, notes);
          toast.success('Order cancelled');
          break;
        default:
          throw new Error('Unknown action');
      }

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
    const actions = [];

    switch (order.status) {
      case 'pending':
        if (canApprove) {
          actions.push(
            {
              key: 'approve',
              label: 'Approve',
              icon: CheckIcon,
              variant: 'success' as const,
              className: 'bg-green-600 hover:bg-green-700 text-white',
              onClick: () => openModal('approve', {
                title: 'Approve Order',
                description: 'Are you sure you want to approve this order? This will allow it to proceed to production.',
                icon: CheckIcon,
                variant: 'success'
              })
            },
            {
              key: 'reject',
              label: 'Reject',
              icon: XMarkIcon,
              variant: 'danger' as const,
              className: 'bg-red-600 hover:bg-red-700 text-white',
              onClick: () => openModal('reject', {
                title: 'Reject Order',
                description: 'Are you sure you want to reject this order? Please provide a reason for rejection.',
                icon: XMarkIcon,
                variant: 'danger'
              })
            }
          );
        }
        break;

      case 'approved':
        if (canUpdate) {
          actions.push({
            key: 'production',
            label: 'Start Production',
            icon: PlayIcon,
            variant: 'primary' as const,
            className: 'bg-blue-600 hover:bg-blue-700 text-white',
            onClick: () => openModal('production', {
              title: 'Move to Production',
              description: 'Move this order to production phase. Production team will be notified.',
              icon: PlayIcon,
              variant: 'primary'
            })
          });
        }
        break;

      case 'processing':
        if (canUpdate) {
          actions.push({
            key: 'ready',
            label: 'Mark Ready',
            icon: ClockIcon,
            variant: 'primary' as const,
            className: 'bg-purple-600 hover:bg-purple-700 text-white',
            onClick: () => openModal('ready', {
              title: 'Mark as Ready',
              description: 'Mark this order as ready for dispatch after quality checks.',
              icon: ClockIcon,
              variant: 'primary'
            })
          });
        }
        break;

      case 'ready':
        if (canUpdate) {
          actions.push({
            key: 'dispatch',
            label: 'Dispatch',
            icon: TruckIcon,
            variant: 'primary' as const,
            className: 'bg-indigo-600 hover:bg-indigo-700 text-white',
            onClick: () => openModal('dispatch', {
              title: 'Dispatch Order',
              description: 'Dispatch this order to the customer. Delivery tracking will begin.',
              icon: TruckIcon,
              variant: 'primary'
            })
          });
        }
        break;

      case 'dispatched':
        if (canUpdate) {
          actions.push({
            key: 'delivered',
            label: 'Mark Delivered',
            icon: CheckCircleIcon,
            variant: 'success' as const,
            className: 'bg-teal-600 hover:bg-teal-700 text-white',
            onClick: () => openModal('delivered', {
              title: 'Mark as Delivered',
              description: 'Confirm that this order has been delivered to the customer.',
              icon: CheckCircleIcon,
              variant: 'success'
            })
          });
        }
        break;

      case 'delivered':
        if (canUpdate) {
          actions.push({
            key: 'complete',
            label: 'Complete',
            icon: BanknotesIcon,
            variant: 'success' as const,
            className: 'bg-green-600 hover:bg-green-700 text-white',
            onClick: () => openModal('complete', {
              title: 'Complete Order',
              description: 'Mark this order as completed. This is the final step in the order lifecycle.',
              icon: BanknotesIcon,
              variant: 'success'
            })
          });
        }
        break;
    }

    // Add cancel option for cancelable statuses
    if (['pending', 'approved', 'processing'].includes(order.status) && canUpdate) {
      actions.push({
        key: 'cancel',
        label: 'Cancel',
        icon: XCircleIcon,
        variant: 'danger' as const,
        className: 'bg-red-600 hover:bg-red-700 text-white border-l border-gray-300 ml-2',
        onClick: () => openModal('cancel', {
          title: 'Cancel Order',
          description: 'Are you sure you want to cancel this order? This action cannot be undone.',
          icon: XCircleIcon,
          variant: 'danger'
        })
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
    </>
  );
};

export default OrderApprovalActions;
