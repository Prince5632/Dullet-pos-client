import React, { useState, Fragment } from 'react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Portal,
  Transition
} from '@headlessui/react';
import {
  ChevronDownIcon,
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
import Badge from '../ui/Badge';
import type { Order } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../utils';

interface OrderStatusDropdownProps {
  order: Order;
  onOrderUpdate: (updatedOrder: Order) => void;
  compact?: boolean;
}

interface StatusAction {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  variant: 'success' | 'danger' | 'primary';
  requiresNotes?: boolean;
}

const OrderStatusDropdown: React.FC<OrderStatusDropdownProps> = ({
  order,
  onOrderUpdate,
  compact = false
}) => {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<StatusAction | null>(null);
  const [notes, setNotes] = useState('');

  const canApprove = hasPermission('orders.approve');
  const canUpdate = hasPermission('orders.update');

  const getAvailableActions = (): StatusAction[] => {
    const actions: StatusAction[] = [];

    switch (order.status) {
      case 'pending':
        if (canApprove) {
          actions.push(
            {
              key: 'approve',
              label: 'Approve',
              icon: CheckIcon,
              description: 'Approve this order for production',
              variant: 'success'
            },
            {
              key: 'reject',
              label: 'Reject',
              icon: XMarkIcon,
              description: 'Reject this order',
              variant: 'danger',
              requiresNotes: true
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
            description: 'Move to production phase',
            variant: 'primary'
          });
        }
        break;

      case 'processing':
        if (canUpdate) {
          actions.push({
            key: 'ready',
            label: 'Mark Ready',
            icon: ClockIcon,
            description: 'Mark as ready for dispatch',
            variant: 'primary'
          });
        }
        break;

      case 'ready':
        if (canUpdate) {
          actions.push({
            key: 'dispatch',
            label: 'Dispatch',
            icon: TruckIcon,
            description: 'Dispatch to customer',
            variant: 'primary'
          });
        }
        break;

      case 'dispatched':
        if (canUpdate) {
          actions.push({
            key: 'delivered',
            label: 'Mark Delivered',
            icon: CheckCircleIcon,
            description: 'Confirm delivery',
            variant: 'success'
          });
        }
        break;

      case 'delivered':
        if (canUpdate) {
          actions.push({
            key: 'complete',
            label: 'Complete',
            icon: BanknotesIcon,
            description: 'Mark as completed',
            variant: 'success'
          });
        }
        break;
    }

    if (['pending', 'approved', 'processing'].includes(order.status) && canUpdate) {
      actions.push({
        key: 'cancel',
        label: 'Cancel',
        icon: XCircleIcon,
        description: 'Cancel this order',
        variant: 'danger'
      });
    }

    return actions;
  };

  const handleActionSelect = (action: StatusAction) => {
    setSelectedAction(action);
    setNotes('');
    setModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    if (selectedAction.requiresNotes && !notes.trim()) {
      toast.error('Notes are required for this action');
      return;
    }

    setLoading(true);
    try {
      let updatedOrder: Order;

      switch (selectedAction.key) {
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
      setModalOpen(false);
      setSelectedAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return (
      <Badge className={orderService.getStatusColor(order.status)} size="sm">
        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
      </Badge>
    );
  }

  return (
    <>
      <div className="relative">
        <Menu as="div" className="relative inline-block text-left">
          <MenuButton
            className={cn(
              'inline-flex items-center gap-x-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200',
              orderService.getStatusColor(order.status),
              availableActions.length > 0 ? 'hover:shadow-md cursor-pointer' : 'cursor-default',
              compact ? 'text-xs px-2 py-1' : ''
            )}
          >
            {compact ? (
              <>
                <span className="truncate">
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                {availableActions.length > 0 && (
                  <ChevronDownIcon className="h-3 w-3 flex-shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="truncate max-w-24">
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                {availableActions.length > 0 && (
                  <ChevronDownIcon className="h-4 w-4 flex-shrink-0" />
                )}
              </>
            )}
          </MenuButton>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            {/* Teleport the dropdown to body to escape table/overflow stacking contexts */}
            <Portal>
              <MenuItems
                anchor="bottom end"
                className="z-50 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-2xl ring-1 ring-black/10 border border-gray-200 max-h-64 overflow-y-auto focus:outline-none"
              >
                <div className="py-1">
                  {availableActions.map((action) => (
                    <MenuItem key={action.key}>
                      {({ active }) => (
                        <button
                          onClick={() => handleActionSelect(action)}
                          className={cn(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'group flex w-full items-center px-4 py-3 text-sm touch-manipulation transition-colors'
                          )}
                        >
                          <action.icon
                            className={cn(
                              'mr-3 h-4 w-4',
                              action.variant === 'success'
                                ? 'text-green-600'
                                : action.variant === 'danger'
                                ? 'text-red-600'
                                : 'text-blue-600'
                            )}
                          />
                          <div className="text-left">
                            <div className="font-medium">{action.label}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {action.description}
                            </div>
                          </div>
                        </button>
                      )}
                    </MenuItem>
                  ))}
                </div>
              </MenuItems>
            </Portal>
          </Transition>
        </Menu>
      </div>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAction(null);
        }}
        title={selectedAction ? `${selectedAction.label} Order` : ''}
        size="md"
      >
        {selectedAction && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div
                className={cn(
                  'flex-shrink-0',
                  selectedAction.variant === 'success'
                    ? 'text-green-600'
                    : selectedAction.variant === 'danger'
                    ? 'text-red-600'
                    : 'text-blue-600'
                )}
              >
                <selectedAction.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">{selectedAction.description}</p>
                <div className="mt-2 text-sm">
                  <span className="font-medium text-gray-900">Order:</span> {order.orderNumber}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="action-notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Notes {selectedAction.requiresNotes ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                id="action-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Add notes for ${selectedAction.label.toLowerCase()}...`}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required={selectedAction.requiresNotes}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setSelectedAction(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={loading || (selectedAction.requiresNotes && !notes.trim())}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
                  selectedAction.variant === 'success'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : selectedAction.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                )}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default OrderStatusDropdown;
