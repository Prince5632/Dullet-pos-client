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
  TruckIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { transitService } from "../../services/transitService";
import { useAuth } from "../../contexts/AuthContext";
import Modal from "../ui/Modal";
import Badge from "../ui/Badge";
import type { Transit } from "../../types";
import { cn } from "../../utils";

interface TransitStatusDropdownProps {
  transit: Transit;
  onTransitUpdate: (updatedTransit: Transit) => void;
  compact?: boolean;
}

interface StatusAction {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  variant: "success" | "danger" | "primary" | "warning";
  requiresNotes?: boolean;
}

const TransitStatusDropdown: React.FC<TransitStatusDropdownProps> = ({
  transit,
  onTransitUpdate,
  compact = false,
}) => {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<StatusAction | null>(null);
  const [notes, setNotes] = useState("");

  // Check if user has permission to update transit status
  const canUpdateStatus = hasPermission("transits.update");

  // Define allowed status transitions
  const statusTransitions: Record<string, string[]> = {
    "Pending": ["In Transit", "Cancelled"],
    "In Transit": ["Received", "Partially Received", "Cancelled"],
    "Partially Received": ["Received", "Cancelled"],
    "Received": [],
    "Cancelled": [],
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "In Transit":
        return TruckIcon;
      case "Received":
        return CheckCircleIcon;
      case "Partially Received":
        return ClockIcon;
      case "Cancelled":
        return XMarkIcon;
      default:
        return TruckIcon;
    }
  };

  const getStatusVariant = (status: string): "success" | "danger" | "primary" | "warning" => {
    switch (status) {
      case "Received":
        return "success";
      case "Cancelled":
        return "danger";
      case "Partially Received":
        return "warning";
      case "In Transit":
        return "primary";
      default:
        return "primary";
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "In Transit":
        return "Mark transit as in transit";
      case "Received":
        return "Mark transit as fully received";
      case "Partially Received":
        return "Mark transit as partially received";
      case "Cancelled":
        return "Cancel this transit";
      default:
        return `Change status to ${status}`;
    }
  };

  const getAvailableActions = (): StatusAction[] => {
    const currentStatus = transit.status;
    const allowedTransitions = statusTransitions[currentStatus] || [];
    
    return allowedTransitions.map(status => ({
      key: status,
      label: status,
      icon: getStatusIcon(status),
      description: getStatusDescription(status),
      variant: getStatusVariant(status),
      requiresNotes: status === "Cancelled" || status === "Partially Received",
    }));
  };

  const handleActionSelect = (action: StatusAction) => {
    setSelectedAction(action);
    setNotes("");
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
      const response = await transitService.updateTransitStatus(transit._id, {
        status: selectedAction.key,
        notes: notes.trim() || undefined,
      });

      if (response.success && response.data) {
        toast.success(`Transit status updated to ${selectedAction.key}`);
        onTransitUpdate(response.data);
      } else {
        toast.error("Failed to update transit status");
      }

      setModalOpen(false);
      setSelectedAction(null);
      setNotes("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const availableActions = getAvailableActions();

  // If no actions available or no permission, show as badge only
  if (availableActions.length === 0 || !canUpdateStatus) {
    return (
      <Badge className={transitService.getStatusColor(transit.status)} size="sm">
        {transitService.getStatusDisplayName(transit.status)}
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
              transitService.getStatusColor(transit.status),
              availableActions.length > 0
                ? "hover:shadow-md cursor-pointer"
                : "cursor-default",
              compact ? "text-xs px-2 py-1" : ""
            )}
          >
            {compact ? (
              <>
                <span className="truncate">
                  {transitService.getStatusDisplayName(transit.status)}
                </span>
                {availableActions.length > 0 && (
                  <ChevronDownIcon className="h-3 w-3 flex-shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="truncate max-w-24">
                  {transitService.getStatusDisplayName(transit.status)}
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
                                : action.variant === "warning"
                                ? "text-orange-600"
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
          setNotes("");
        }}
        title={selectedAction ? `Update Transit Status` : ""}
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
                    : selectedAction.variant === "warning"
                    ? "text-orange-600"
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
                  <span className="font-medium text-gray-900">Transit:</span>{" "}
                  {transitService.formatTransitId(transit.transitId)}
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-900">Current Status:</span>{" "}
                  {transit.status} → <span className="font-medium text-blue-600">{selectedAction.key}</span>
                </div>
              </div>
            </div>

            {/* <div>
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
                placeholder={`Add notes for status change to ${selectedAction.key}...`}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required={selectedAction.requiresNotes}
              />
            </div> */}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setSelectedAction(null);
                  setNotes("");
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
                    : selectedAction.variant === "warning"
                    ? "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                )}
              >
                {loading ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default TransitStatusDropdown;