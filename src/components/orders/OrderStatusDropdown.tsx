import React, { useState, Fragment } from "react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Portal,
  Transition,
} from "@headlessui/react";
import {
  ChevronDownIcon,
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  CheckCircleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { orderService } from "../../services/orderService";
import { useAuth } from "../../contexts/AuthContext";
import Modal from "../ui/Modal";
import Badge from "../ui/Badge";
import DriverAssignmentModal from "./DriverAssignmentModal";
import DeliveryRecordingModal from "./DeliveryRecordingModal";
import type { Order } from "../../types";
import { cn } from "../../utils";

interface OrderStatusDropdownProps {
  order: Order;
  onOrderUpdate: (updatedOrder: Order) => void;
  compact?: boolean;
  onAssignDriver?: () => void;
  onRecordDelivery?: () => void;
}

interface StatusAction {
  key:
    | "approve"
    | "reject"
    | "assignDriver"
    | "unassignDriver"
    | "markOutForDelivery"
    | "recordDelivery";
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  variant: "success" | "danger" | "primary";
  requiresNotes?: boolean;
  requiresModal?: boolean;
}

const OrderStatusDropdown: React.FC<OrderStatusDropdownProps> = ({
  order,
  onOrderUpdate,
  compact = false,
  onAssignDriver,
  onRecordDelivery,
}) => {
  const { hasPermission, hasRole, getUserId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<StatusAction | null>(
    null
  );
  const [notes, setNotes] = useState("");

  const canApprove = hasPermission("orders.approve") || hasRole("Manager");
  const canManage =
    hasPermission("orders.manage") || hasRole("Manager") || hasRole("Driver");

  const isDriver = hasRole("Driver");
  const driverAssigned = !!order.driverAssignment?.driver;
  const currentUserId = getUserId();
  const assignedDriverId = (() => {
    const drv = order.driverAssignment?.driver as any;
    if (!drv) return null;
    // Support populated user object or raw ObjectId string
    return typeof drv === "string" ? drv : drv._id;
  })();
  const isAssignedToCurrentDriver =
    driverAssigned && assignedDriverId === currentUserId;

  const getAvailableActions = (): StatusAction[] => {
    const actions: StatusAction[] = [];

    switch (order.status) {
      case "pending":
        if (canApprove) {
          actions.push(
            {
              key: "approve",
              label: "Approve",
              icon: CheckIcon,
              description: "Approve this order for delivery",
              variant: "success",
            },
            {
              key: "reject",
              label: "Reject",
              icon: XMarkIcon,
              description: "Reject this order",
              variant: "danger",
              requiresNotes: true,
            }
          );
        }
        break;

      case "approved":
        if (canManage) {
          actions.push({
            key: "assignDriver",
            label: driverAssigned ? "Reassign Driver" : "Assign Driver",
            icon: TruckIcon,
            description: driverAssigned
              ? "Change the assigned driver for this order"
              : "Assign a driver to deliver this order",
            variant: "primary",
          });
          if (driverAssigned) {
            actions.push({
              key: "unassignDriver",
              label: "Unassign Driver",
              icon: XMarkIcon,
              description: "Remove the assigned driver",
              variant: "danger",
            });
          }
        }
        break;

      case "driver_assigned":
        if ((canManage && !isDriver) || isAssignedToCurrentDriver) {
          actions.push({
            key: "markOutForDelivery",
            label: "Mark Out for Delivery",
            icon: MapPinIcon,
            description: "Confirm pickup and start delivery",
            variant: "primary",
          });
        }
        break;

      case "out_for_delivery":
        if ((canManage && !isDriver) || isAssignedToCurrentDriver) {
          actions.push({
            key: "recordDelivery",
            label: "Record Delivery",
            icon: CheckCircleIcon,
            description: "Capture signatures and settlement to mark delivered",
            variant: "success",
          });
        }
        break;

      default:
        break;
    }

    if (order.status === "pending" && canManage) {
      actions.push({
        key: "reject",
        label: "Cancel Order",
        icon: XMarkIcon,
        description: "Cancel this order",
        variant: "danger",
        requiresNotes: true,
      });
    }

    return actions;
  };

  const handleActionSelect = (action: StatusAction) => {
    setSelectedAction(action);
    setNotes("");

    if (["assignDriver", "recordDelivery"].includes(action.key)) {
      if (action.key === "assignDriver") {
        if (onAssignDriver) {
          onAssignDriver();
        } else {
          setDriverModalOpen(true);
        }
      }
      if (action.key === "recordDelivery") {
        if (onRecordDelivery) {
          onRecordDelivery();
        } else {
          setDeliveryModalOpen(true);
        }
      }
      return;
    }

    setModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    if (selectedAction.requiresNotes && !notes.trim()) {
      toast.error("Notes are required for this action");
      return;
    }

    setLoading(true);
    try {
      let updatedOrder: Order | null = null;

      switch (selectedAction.key) {
        case "approve":
          updatedOrder = await orderService.approveOrder(order._id, notes);
          toast.success("Order approved successfully");
          break;
        case "reject":
          updatedOrder = await orderService.rejectOrder(order._id, notes);
          toast.success("Order rejected");
          break;
        case "unassignDriver":
          updatedOrder = await orderService.unassignDriver(order._id, notes);
          toast.success("Driver unassigned");
          break;
        case "markOutForDelivery":
          updatedOrder = await orderService.markOutForDelivery(order._id, {
            notes,
            location: undefined,
          });
          toast.success("Order marked out for delivery");
          break;
        default:
          break;
      }

      if (updatedOrder) {
        onOrderUpdate(updatedOrder);
      }
      setModalOpen(false);
      setSelectedAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
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
              "inline-flex items-center gap-x-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200",
              orderService.getStatusColor(order.status),
              availableActions.length > 0
                ? "hover:shadow-md cursor-pointer"
                : "cursor-default",
              compact ? "text-xs px-2 py-1" : ""
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
            <Portal>
              <MenuItems
                anchor="bottom end"
                className="z-50 mt-2 w-64 origin-top-right rounded-lg bg-white shadow-2xl ring-1 ring-black/10 border border-gray-200 max-h-64 overflow-y-auto focus:outline-none"
              >
                <div className="py-1">
                  {availableActions.map((action) => (
                    <MenuItem key={action.key}>
                      {({ active }) => (
                        <button
                          onClick={() => handleActionSelect(action)}
                          className={cn(
                            active
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-700",
                            "group flex w-full items-center px-4 py-3 text-sm touch-manipulation transition-colors"
                          )}
                        >
                          <action.icon
                            className={cn(
                              "mr-3 h-4 w-4",
                              action.variant === "success"
                                ? "text-green-600"
                                : action.variant === "danger"
                                ? "text-red-600"
                                : "text-blue-600"
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

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAction(null);
        }}
        title={selectedAction ? `${selectedAction.label} Order` : ""}
        size="md"
      >
        {selectedAction && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div
                className={cn(
                  "flex-shrink-0",
                  selectedAction.variant === "success"
                    ? "text-green-600"
                    : selectedAction.variant === "danger"
                    ? "text-red-600"
                    : "text-blue-600"
                )}
              >
                <selectedAction.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  {selectedAction.description}
                </p>
                <div className="mt-2 text-sm">
                  <span className="font-medium text-gray-900">Order:</span>{" "}
                  {order.orderNumber}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="action-notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Notes{" "}
                {selectedAction.requiresNotes ? "(Required)" : "(Optional)"}
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
                disabled={
                  loading || (selectedAction.requiresNotes && !notes.trim())
                }
                className={cn(
                  "px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedAction.variant === "success"
                    ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                    : selectedAction.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                )}
              >
                {loading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <DriverAssignmentModal
        isOpen={driverModalOpen}
        onClose={() => setDriverModalOpen(false)}
        order={order}
        onOrderUpdate={onOrderUpdate}
      />

      <DeliveryRecordingModal
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        order={order}
        onOrderUpdate={onOrderUpdate}
      />
    </>
  );
};

export default OrderStatusDropdown;
