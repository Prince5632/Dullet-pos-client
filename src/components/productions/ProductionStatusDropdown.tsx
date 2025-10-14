import React, { useState, Fragment, useEffect } from "react";
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
  CheckCircleIcon,
  CogIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  DocumentIcon,
  XMarkIcon,
  EyeIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { productionService } from "../../services/productionService";
import { useAuth } from "../../contexts/AuthContext";
import Modal from "../ui/Modal";
import Badge from "../ui/Badge";
import PhotoCaptureModal from "../common/PhotoCaptureModal";
import type {
  Production,
  OutputDetail,
  ProductionAttachment,
} from "../../types";
import { cn } from "../../utils";

interface ProductionStatusDropdownProps {
  production: Production;
  onProductionUpdate: (updatedProduction: Production) => void;
  compact?: boolean;
}

interface StatusAction {
  key: "markFinished";
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  variant: "success" | "primary";
}

interface FinishProductionForm {
  outputDetails: OutputDetail[];
  attachments: File[];
  remarks?: string;
}

const ProductionStatusDropdown: React.FC<ProductionStatusDropdownProps> = ({
  production,
  onProductionUpdate,
  compact = false,
}) => {
  const { hasPermission, hasRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [form, setForm] = useState<FinishProductionForm>({
    outputDetails: [
      {
        itemName: "Atta",
        productQty: 0,
        productUnit: "KG",
        notes: "",
      },
    ],
    attachments: [],
    remarks: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>(
    {}
  );
  const [removedAttachments, setRemovedAttachments] = useState<string[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<
    ProductionAttachment[]
  >([]);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    file: File | null;
    previewUrl: string | null;
    existingAttachment?: ProductionAttachment | null;
  }>({
    isOpen: false,
    file: null,
    previewUrl: null,
    existingAttachment: null,
  });

  const canManage =
    hasPermission("production.manage") || hasRole("Super Admin");

  // Initialize form with production data when modal opens
  useEffect(() => {
    if (finishModalOpen && production) {
      setForm({
        outputDetails:
          production.outputDetails && production.outputDetails.length > 0
            ? production.outputDetails
            : [
                {
                  itemName: "Atta",
                  productQty: 0,
                  productUnit: "KG",
                  notes: "",
                },
                {
                  itemName: "Chokar",
                  productQty: 0,
                  productUnit: "KG",
                  notes: "",
                },
                {
                  itemName: "Wastage",
                  productQty: 0,
                  productUnit: "KG",
                  notes: "",
                },
              ],
        attachments: [],
        remarks: production.remarks || "",
      });

      // Set existing attachments
      if (production.attachments) {
        setExistingAttachments(production.attachments);
      }
    }
  }, [finishModalOpen, production]);

  const getStatusVariant = (
    status: string
  ): "success" | "warning" | "default" => {
    switch (status) {
      case "Finished":
        return "success";
      case "In Production":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusDisplayName = (status: string) => {
    return status;
  };

  const getAvailableActions = (): StatusAction[] => {
    const actions: StatusAction[] = [];

    if (!canManage) return actions;

    // Only allow marking as finished if currently in production
    // Once finished, cannot revert back to "In Production"
    if (production.status === "In Production") {
      actions.push({
        key: "markFinished",
        label: "Mark as Finished",
        icon: CheckCircleIcon,
        description: "Complete production and record output details",
        variant: "success",
      });
    }

    return actions;
  };

  const handleActionSelect = (action: StatusAction) => {
    if (action.key === "markFinished") {
      setFinishModalOpen(true);
    }
  };

  const handleFinishProduction = async () => {
    // Validate output details
    const hasValidOutputs = form.outputDetails.some(
      (output) => output.itemName && output.productQty > 0 && output.productUnit
    );

    if (!hasValidOutputs) {
      toast.error("Please add at least one valid output detail");
      return;
    }

    try {
      setLoading(true);

      // Create update payload with proper typing
      const updatePayload = {
        productionDate: production.productionDate.split("T")[0],
        status: "Finished" as const,
        shift: production.shift,
        location: production.location,
        machine: production.machine,
        operator: production.operator,
        inputType: production.inputType,
        inputQty: production.inputQty,
        inputUnit: production.inputUnit,
        outputDetails: form.outputDetails,
        attachments: selectedFiles,
        remarks: form.remarks || production.remarks,
        removedAttachments: removedAttachments,
      };

      const res = await productionService.updateProduction(
        production._id,
        updatePayload
      );

      if (res.success && res.data) {
        // Create the updated production object with proper typing
        const updatedProduction: Production = {
          ...production,
          ...res.data,
          status: "Finished",
          outputDetails: form.outputDetails,
          remarks: form.remarks || production.remarks,
          // Ensure inputUnit is properly typed
          inputUnit: production.inputUnit as "KG" | "Quintal" | "Ton",
        };

        onProductionUpdate(updatedProduction);
        toast.success("Production marked as finished");
        setFinishModalOpen(false);
        resetForm();
      } else {
        throw new Error(res.message || "Failed to finish production");
      }
    } catch (error: any) {
      console.error("Failed to finish production:", error);
      toast.error(error.message || "Failed to finish production");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      outputDetails: [
        {
          itemName: "Atta",
          productQty: 0,
          productUnit: "KG",
          notes: "",
        },
      ],
      attachments: [],
      remarks: "",
    });
    setSelectedFiles([]);
    setFilePreviews({});
    setRemovedAttachments([]);
    setExistingAttachments([]);
  };

  const handleOutputDetailChange = (
    index: number,
    field: keyof OutputDetail,
    value: any
  ) => {
    const updatedOutputDetails = [...form.outputDetails];
    updatedOutputDetails[index] = {
      ...updatedOutputDetails[index],
      [field]: value,
    };
    setForm((prev) => ({ ...prev, outputDetails: updatedOutputDetails }));
  };

  const addOutputDetail = () => {
    setForm((prev) => ({
      ...prev,
      outputDetails: [
        ...prev.outputDetails,
        {
          itemName: "Atta",
          productQty: 0,
          productUnit: "KG",
          notes: "",
        },
      ],
    }));
  };

  const removeOutputDetail = (index: number) => {
    if (form.outputDetails.length > 1) {
      const updatedOutputDetails = form.outputDetails.filter(
        (_, i) => i !== index
      );
      setForm((prev) => ({ ...prev, outputDetails: updatedOutputDetails }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      if (!file || !file.type) {
        errors.push(`Invalid file: ${file?.name || "Unknown file"}`);
        return;
      }

      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: Only image files are allowed`);
        return;
      }

      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size must be under 2MB`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
    }

    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);

      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews((prev) => ({
            ...prev,
            [file.name]: e.target?.result as string,
          }));
        };
        reader.readAsDataURL(file);
      });

      toast.success(`${validFiles.length} image(s) added successfully`);
    }

    e.target.value = "";
  };

  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    if (!fileToRemove) return;

    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      const updated = { ...prev };
      delete updated[fileToRemove.name];
      return updated;
    });
  };

  const removeExistingAttachment = (attachmentId: string) => {
    setExistingAttachments((prev) =>
      prev.filter((file) => file._id !== attachmentId)
    );
    setRemovedAttachments((prev) => [...prev, attachmentId]);
    toast.success("Attachment marked for removal");
  };

  const openPreview = (file: File) => {
    if (!file) return;

    let previewUrl = null;
    if (file.type?.startsWith("image/")) {
      previewUrl = filePreviews[file.name] || null;
    }

    setPreviewModal({
      isOpen: true,
      file,
      previewUrl,
      existingAttachment: null,
    });
  };

  const openExistingAttachmentPreview = (attachment: ProductionAttachment) => {
    if (!attachment) return;

    let previewUrl = null;
    if (attachment.fileType?.startsWith("image/")) {
      previewUrl = `data:${attachment.fileType};base64,${attachment.base64Data}`;
    }

    setPreviewModal({
      isOpen: true,
      file: null,
      previewUrl,
      existingAttachment: attachment,
    });
  };

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      file: null,
      previewUrl: null,
      existingAttachment: null,
    });
  };

  const handleCameraCapture = (imageData: string, imageFile: File) => {
    if (!imageFile || !imageFile.type) {
      toast.error("Invalid captured image");
      return;
    }

    if (!imageFile.type.startsWith("image/")) {
      toast.error("Captured file is not an image");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      toast.error(
        `Captured image is too large: ${(imageFile.size / 1024 / 1024).toFixed(
          2
        )}MB. Maximum allowed: 2MB`
      );
      return;
    }

    setSelectedFiles((prev) => [...prev, imageFile]);

    setFilePreviews((prev) => ({
      ...prev,
      [imageFile.name]: imageData,
    }));

    toast.success("Image captured successfully");
  };

  const getFileIcon = (file: File) => {
    const fileType = file?.type || "";

    if (fileType.startsWith("image/")) {
      return <PhotoIcon className="w-5 h-5 text-green-500" />;
    } else {
      return <DocumentIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const availableActions = getAvailableActions();

  // If no actions available or no permission, show as badge only (like TransitStatusDropdown)
  if (availableActions.length === 0 || !canManage) {
    return (
      <Badge variant={getStatusVariant(production.status)} size="sm">
        {getStatusDisplayName(production.status)}
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
              getStatusVariant(production.status) === "success"
                ? "bg-green-50 text-green-700 ring-green-600/20"
                : getStatusVariant(production.status) === "warning"
                ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
                : "bg-gray-50 text-gray-700 ring-gray-600/20",
              availableActions.length > 0
                ? "hover:shadow-md cursor-pointer"
                : "cursor-default",
              compact ? "text-xs px-2 py-1" : ""
            )}
          >
            {compact ? (
              <>
                <span className="truncate">
                  {getStatusDisplayName(production.status)}
                </span>
                {availableActions.length > 0 && (
                  <ChevronDownIcon className="h-3 w-3 flex-shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="truncate max-w-24">
                  {getStatusDisplayName(production.status)}
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

      {/* Finish Production Modal */}
      <Modal
        isOpen={finishModalOpen}
        onClose={() => {
          setFinishModalOpen(false);
          resetForm();
        }}
        title="Finish Production"
        size="lg"
        preventAutoClose={true}
      >
        <div className="space-y-6">
          {/* Output Details */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Output Details
              </h3>
              <button
                type="button"
                onClick={addOutputDetail}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Output
              </button>
            </div>

            <div className="space-y-4">
              {form.outputDetails.map((output, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Output {index + 1}
                    </h4>
                    {form.outputDetails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOutputDetail(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Name *
                      </label>
                      <select
                        value={output.itemName}
                        onChange={(e) =>
                          handleOutputDetailChange(
                            index,
                            "itemName",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Atta">Atta</option>
                        <option value="Chokar">Chokar</option>
                        <option value="Wastage">Wastage</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={output.productQty}
                        onChange={(e) =>
                          handleOutputDetailChange(
                            index,
                            "productQty",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit *
                      </label>
                      <select
                        value={output.productUnit}
                        onChange={(e) =>
                          handleOutputDetailChange(
                            index,
                            "productUnit",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="KG">KG</option>
                        <option value="Quintal">Quintal</option>
                        <option value="Ton">Ton</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={output.notes}
                      onChange={(e) =>
                        handleOutputDetailChange(index, "notes", e.target.value)
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional notes for this output..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCameraModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <CameraIcon className="w-4 h-4" />
                  Camera
                </button>
                <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                  <PhotoIcon className="w-4 h-4" />
                  Upload
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Existing Attachments */}
            {existingAttachments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Previously Uploaded
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {existingAttachments.map((attachment, index) => (
                    <div key={`existing-${index}`} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                        {attachment.fileType?.startsWith("image/") ? (
                          <img
                            src={`data:${attachment.fileType};base64,${attachment.base64Data}`}
                            alt={attachment.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <DocumentIcon className="w-8 h-8 text-blue-500" />
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openExistingAttachmentPreview(attachment)
                            }
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeExistingAttachment(attachment._id)
                            }
                            className="p-2 bg-white rounded-full text-red-600 hover:text-red-700 transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded truncate">
                          {attachment.fileName}
                        </div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <div className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Existing
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New File Uploads */}
            {selectedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  New Uploads
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedFiles.map((file, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-200">
                        {filePreviews[file.name] ? (
                          <img
                            src={filePreviews[file.name]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getFileIcon(file)}
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openPreview(file)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600 transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded truncate">
                          {file.name}
                        </div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          New
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show message when no attachments */}
            {existingAttachments.length === 0 && selectedFiles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <PhotoIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>
                  No attachments yet. Use the camera or upload button to add
                  images.
                </p>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              value={form.remarks}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, remarks: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional remarks for finishing this production..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex bg-white py-2  justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setFinishModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFinishProduction}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Finishing..." : "Finish Production"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Camera Modal */}
      <PhotoCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title="Capture Production Image"
      />

      {/* File Preview Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={closePreviewModal}
        title="File Preview"
        size="lg"
      >
        <div className="space-y-4">
          {previewModal.file && (
            <>
              <div className="text-sm text-gray-600">
                <strong>File:</strong> {previewModal.file.name}
              </div>
              {previewModal.previewUrl && (
                <div className="flex justify-center">
                  <img
                    src={previewModal.previewUrl}
                    alt={previewModal.file.name}
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              )}
            </>
          )}
          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCameraModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <CameraIcon className="w-4 h-4" />
                  Camera
                </button>
                <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                  <PhotoIcon className="w-4 h-4" />
                  Upload
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Existing Attachments */}
            {existingAttachments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Previously Uploaded
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {existingAttachments.map((attachment, index) => (
                    <div key={`existing-${index}`} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                        {attachment.fileType?.startsWith("image/") ? (
                          <img
                            src={`data:${attachment.fileType};base64,${attachment.base64Data}`}
                            alt={attachment.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <DocumentIcon className="w-8 h-8 text-blue-500" />
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openExistingAttachmentPreview(attachment)
                            }
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeExistingAttachment(attachment?._id)
                            }
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600 transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded truncate">
                          {attachment.fileName}
                        </div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <div className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                          Existing
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New File Uploads */}
            {selectedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  New Uploads
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedFiles.map((file, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-200">
                        {filePreviews[file.name] ? (
                          <img
                            src={filePreviews[file.name]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getFileIcon(file)}
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openPreview(file)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600 transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded truncate">
                          {file.name}
                        </div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          New
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show message when no attachments */}
            {(!production.attachments ||
              production.attachments.filter(
                (attachment) => !removedAttachments.includes(attachment?._id)
              ).length === 0) &&
              selectedFiles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <PhotoIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>
                    No attachments yet. Use the camera or upload button to add
                    images.
                  </p>
                </div>
              )}
          </div>
        </div>
      </Modal>

      {/* File Preview Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={closePreviewModal}
        title="File Preview"
        size="lg"
      >
        <div className="space-y-4">
          {previewModal.file && (
            <>
              <div className="text-sm text-gray-600">
                <strong>File:</strong> {previewModal.file.name}
              </div>
              {previewModal.previewUrl && (
                <div className="flex justify-center">
                  <img
                    src={previewModal.previewUrl}
                    alt={previewModal.file.name}
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              )}
            </>
          )}
          {previewModal.existingAttachment && (
            <>
              <div className="text-sm text-gray-600">
                <strong>File:</strong>{" "}
                {previewModal.existingAttachment.fileName}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Size:</strong>{" "}
                {(previewModal.existingAttachment.fileSize / 1024).toFixed(2)}{" "}
                KB
              </div>
              <div className="text-sm text-gray-600">
                <strong>Uploaded:</strong>{" "}
                {new Date(
                  previewModal.existingAttachment.uploadedAt
                ).toLocaleDateString()}
              </div>
              {previewModal.previewUrl && (
                <div className="flex justify-center">
                  <img
                    src={previewModal.previewUrl}
                    alt={previewModal.existingAttachment.fileName}
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ProductionStatusDropdown;
