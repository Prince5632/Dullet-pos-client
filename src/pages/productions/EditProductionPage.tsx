import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { productionService } from "../../services/productionService";
import { userService } from "../../services/userService";
import type { UpdateProductionForm, User, Production } from "../../types";
import {
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
  UserIcon,
  CubeIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon,
  CameraIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import PhotoCaptureModal from "../../components/common/PhotoCaptureModal";

interface ValidationErrors {
  outputDetails?: string[];
  productionDate?: string;
  shift?: string;
  location?: string;
  machine?: string;
  operator?: string;
  inputType?: string;
  inputQty?: string;
  inputUnit?: string;
}

interface OutputDetail {
  itemName: string;
  productQty: number;
  productUnit: string;
  notes?: string;
}

const EditProductionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [production, setProduction] = useState<Production | null>(null);
  const [form, setForm] = useState<UpdateProductionForm>({
    productionDate: new Date().toISOString().split("T")[0],
    status: "In Production",
    shift: "Morning",
    location: "",
    machine: "",
    operator: "",
    inputType: "",
    inputQty: 0,
    inputUnit: "KG",
    outputDetails: [
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
    remarks: "",
    attachments: [],
    removedAttachments: [],
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>(
    {}
  );
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    file: File | any | null;
    previewUrl: string | null;
    isExisting: boolean;
  }>({
    isOpen: false,
    file: null,
    previewUrl: null,
    isExisting: false,
  });
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduction();
    }
  }, [id]);

  const loadProduction = async () => {
    try {
      setLoading(true);
      const res = await productionService.getProductionById(id!);
      if (res.success && res.data) {
        const productionData = res.data as Production;
        setProduction(productionData);

        // Populate form with existing data
        setForm({
          productionDate: productionData.productionDate.split("T")[0],
          status: productionData.status || "In Production",
          shift: productionData.shift,
          location: productionData.location,
          machine: productionData.machine,
          operator: productionData.operator,
          inputType: productionData.inputType,
          inputQty: productionData.inputQty,
          inputUnit: productionData.inputUnit,
          outputDetails:
            productionData.outputDetails?.length > 0
              ? productionData.outputDetails.map((output) => ({
                  itemName: output.itemName,
                  productQty: output.productQty,
                  productUnit: output.productUnit,
                  notes: output.notes || "",
                }))
              : form.outputDetails,
          remarks: productionData.remarks || "",
          attachments: [],
          removedAttachments: [],
        });

        // Set existing attachments
        if (productionData.attachments) {
          setExistingAttachments(productionData.attachments);
        }
      } else {
        throw new Error(res.message || "Failed to load production");
      }
    } catch (error: any) {
      console.error("Failed to load production:", error);
      toast.error(error.message || "Failed to load production");
      navigate("/productions");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setLocationLoading(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Use reverse geocoding to get readable address
          const address = await reverseGeocode(latitude, longitude);

          if (address) {
            setForm((prev: UpdateProductionForm) => ({
              ...prev,
              location: address,
            }));
            toast.success("Location fetched successfully");
          } else {
            // Fallback to coordinates if reverse geocoding fails
            const coordsAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(
              6
            )}`;
            setForm((prev: UpdateProductionForm) => ({
              ...prev,
              location: coordsAddress,
            }));
            toast.success("Location coordinates fetched");
          }
        } catch (error) {
          console.error("Error processing location:", error);
          toast.error("Failed to process location data");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Failed to get location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }

        toast.error(errorMessage);
        setLocationLoading(false);
      },
      options
    );
  };

  const reverseGeocode = async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Dullet-POS-App/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Reverse geocoding failed");
      }

      const data = await response.json();

      if (data && data.display_name) {
        // Extract relevant parts of the address
        const address = data.address;
        let formattedAddress = "";

        if (address) {
          const parts = [];

          // Add building/house number and road
          if (address.house_number && address.road) {
            parts.push(`${address.house_number} ${address.road}`);
          } else if (address.road) {
            parts.push(address.road);
          }

          // Add locality/suburb
          if (address.suburb || address.locality || address.village) {
            parts.push(address.suburb || address.locality || address.village);
          }

          // Add city
          if (address.city || address.town) {
            parts.push(address.city || address.town);
          }

          // Add state
          if (address.state) {
            parts.push(address.state);
          }

          formattedAddress = parts.join(", ");
        }

        return formattedAddress || data.display_name;
      }

      return null;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Required field validations
    if (!form.productionDate) {
      newErrors.productionDate = "Production date is required";
    }

    if (!form.shift) {
      newErrors.shift = "Shift is required";
    }

    if (!form.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!form.inputType.trim()) {
      newErrors.inputType = "Input type is required";
    }

    if (!form.inputQty || form.inputQty <= 0) {
      newErrors.inputQty = "Input quantity must be greater than 0";
    }

    if (!form.inputUnit.trim()) {
      newErrors.inputUnit = "Input unit is required";
    }

    // Output details validation - mandatory when status is "Finished"
    const outputErrors: string[] = [];
    const isFinished = form.status === "Finished";
    if (isFinished && form.outputDetails.length === 0) {
      newErrors.outputDetails = [
        "At least one output detail is required when status is Finished",
      ];
    } else {
      form.outputDetails.forEach((output: OutputDetail, index: number) => {
        if (isFinished) {
          // Mandatory validation for "Finished" status
          if (!output.itemName.trim()) {
            outputErrors[index] = `Output ${index + 1}: Item name is required`;
          } else if (!output.productQty || output.productQty <= 0) {
            outputErrors[index] = `Output ${
              index + 1
            }: Quantity must be greater than 0`;
          } else if (!output.productUnit.trim()) {
            outputErrors[index] = `Output ${index + 1}: Unit is required`;
          }
        } else {
          // Optional validation for "In Production" status - only validate if fields are filled
          if (
            output.itemName.trim() &&
            (!output.productQty || output.productQty <= 0)
          ) {
            outputErrors[index] = `Output ${
              index + 1
            }: Quantity must be greater than 0`;
          } else if (output.itemName.trim() && !output.productUnit.trim()) {
            outputErrors[index] = `Output ${index + 1}: Unit is required`;
          }
        }
      });

      if (outputErrors.length > 0) {
        newErrors.outputDetails = outputErrors;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    try {
      setSaving(true);

      const formData: UpdateProductionForm = {
        ...form,
        attachments: selectedFiles,
      };

      const res = await productionService.updateProduction(id!, formData);

      if (res.success) {
        toast.success("Production updated successfully");
        navigate(`/productions/${id}`);
      } else {
        throw new Error(res.message || "Failed to update production");
      }
    } catch (error: any) {
      console.error("Failed to update production:", error);
      toast.error(error.message || "Failed to update production");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof UpdateProductionForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
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

    // Clear output errors when user starts typing
    if (errors.outputDetails && errors.outputDetails[index]) {
      const newOutputErrors = [...(errors.outputDetails || [])];
      newOutputErrors[index] = "";
      setErrors((prev) => ({ ...prev, outputDetails: newOutputErrors }));
    }
  };

  const addOutputDetail = () => {
    setForm((prev) => ({
      ...prev,
      outputDetails: [
        ...prev.outputDetails,
        {
          itemName: "",
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

    // Validate files before processing
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Check if file exists and has a type
      if (!file || !file.type) {
        errors.push(`Invalid file: ${file?.name || "Unknown file"}`);
        return;
      }

      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: Only image files are allowed`);
        return;
      }

      // Check file size (2MB = 2 * 1024 * 1024 bytes)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(
          `${file.name}: File size must be under 2MB (current: ${(
            file.size /
            1024 /
            1024
          ).toFixed(2)}MB)`
        );
        return;
      }

      validFiles.push(file);
    });

    // Show errors if any
    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
    }

    // Add valid files
    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);

      // Generate previews for new valid files
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

    // Clear the input
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
    setForm((prev) => ({
      ...prev,
      removedAttachments: [...(prev.removedAttachments || []), attachmentId],
    }));
    toast.success("Attachment marked for removal");
  };

  const openPreview = (file: File | any, isExisting: boolean = false) => {
    if (!file) return;

    let previewUrl = null;

    if (isExisting) {
      if (file.fileType?.startsWith("image/") && file.base64Data) {
        previewUrl = `data:${file.fileType};base64,${file.base64Data}`;
      }
    } else {
      if (file.type?.startsWith("image/")) {
        previewUrl = filePreviews[file.name] || null;
      }
    }

    setPreviewModal({
      isOpen: true,
      file,
      previewUrl,
      isExisting,
    });
  };

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      file: null,
      previewUrl: null,
      isExisting: false,
    });
  };

  const handleCameraCapture = (imageData: string, imageFile: File) => {
    // Validate the captured image file
    if (!imageFile || !imageFile.type) {
      toast.error("Invalid captured image");
      return;
    }

    if (!imageFile.type.startsWith("image/")) {
      toast.error("Captured file is not an image");
      return;
    }

    // Check file size (2MB limit)
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

    // Use the provided imageData for preview
    setFilePreviews((prev) => ({
      ...prev,
      [imageFile.name]: imageData,
    }));

    toast.success("Image captured successfully");
  };

  const getFileIcon = (file: any) => {
    const fileType = file?.fileType || file?.type || "";

    if (fileType.startsWith("image/")) {
      return <PhotoIcon className="w-5 h-5 text-green-500" />;
    } else {
      return <DocumentIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const inputUnits = ["KG", "Quintal", "Ton"];
  const outputUnits = ["KG", "Quintal", "Ton"];
  const itemNames = ["Atta", "Chokar", "Wastage"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading production details...</p>
        </div>
      </div>
    );
  }

  if (!production) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CubeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Production Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The production you're trying to edit doesn't exist or has been
            removed.
          </p>
          <button
            onClick={() => navigate("/productions")}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Productions
          </button>
        </div>
      </div>
    );
  }
  // Prevent editing if order is delivered
  if (production.status === "Finished") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-green-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Production already marked {production?.status}
          </h2>
          <p className="text-gray-600 mb-6">
            This production has been {production?.status} and cannot be edited.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/productions/${production._id}`)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            View Production Details
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/productions/${id}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Production</h1>
          <p className="text-sm text-gray-600">
            Update production record{" "}
            {productionService.formatBatchId(production.batchId)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <CogIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Basic Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Production Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Production Date *
              </label>
              <input
                type="date"
                value={form.productionDate}
                onChange={(e) =>
                  handleInputChange("productionDate", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.productionDate ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.productionDate && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.productionDate}
                </p>
              )}
            </div>

            {/* Shift */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift *
              </label>
              <select
                value={form.shift}
                onChange={(e) => handleInputChange("shift", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.shift ? "border-red-300" : "border-gray-300"
                }`}
              >
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
              {errors.shift && (
                <p className="mt-1 text-xs text-red-600">{errors.shift}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter production location or click to fetch current location"
                  value={form.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.location ? "border-red-300" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={fetchCurrentLocation}
                  disabled={locationLoading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                  title="Fetch current location"
                >
                  {locationLoading ? (
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.location && (
                <p className="mt-1 text-xs text-red-600">{errors.location}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Click the location icon to automatically fetch your current
                address
              </p>
            </div>

            {/* Machine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Machine
              </label>
              <input
                type="text"
                placeholder="Enter machine name or ID"
                value={form.machine}
                onChange={(e) => handleInputChange("machine", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.machine ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.machine && (
                <p className="mt-1 text-xs text-red-600">{errors.machine}</p>
              )}
            </div>

            {/* Operator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <input
                type="text"
                placeholder="Enter machine name or ID"
                value={form.operator}
                onChange={(e) => handleInputChange("machine", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.operator ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.operator && (
                <p className="mt-1 text-xs text-red-600">{errors.operator}</p>
              )}
            </div>
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={form.status}
                disabled={production?.status === "Finished"}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.status ? "border-red-300" : "border-gray-300"
                }`}
              >
                <option value="In Production">In Production</option>
                <option value="Finished">Finished</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-xs text-red-600">{errors.status}</p>
              )}
            </div>
          </div>
        </div>

        {/* Input Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <CubeIcon className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Input Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Input Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Type *
              </label>
              <input
                type="text"
                placeholder="e.g., Wheat, Rice, etc."
                value={form.inputType}
                onChange={(e) => handleInputChange("inputType", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.inputType ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.inputType && (
                <p className="mt-1 text-xs text-red-600">{errors.inputType}</p>
              )}
            </div>

            {/* Input Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Quantity *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.inputQty}
                onChange={(e) =>
                  handleInputChange("inputQty", parseFloat(e.target.value) || 0)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.inputQty ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.inputQty && (
                <p className="mt-1 text-xs text-red-600">{errors.inputQty}</p>
              )}
            </div>

            {/* Input Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Unit *
              </label>
              <select
                value={form.inputUnit}
                onChange={(e) => handleInputChange("inputUnit", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.inputUnit ? "border-red-300" : "border-gray-300"
                }`}
              >
                {inputUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {errors.inputUnit && (
                <p className="mt-1 text-xs text-red-600">{errors.inputUnit}</p>
              )}
            </div>
          </div>
        </div>

        {/* Output Details */}
        {form?.status === "Finished" ? (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CubeIcon className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Output Details
                </h2>
              </div>
              <button
                type="button"
                onClick={addOutputDetail}
                className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Output
              </button>
            </div>

            <div className="space-y-5">
              {form.outputDetails.map((output, index) => (
                <div
                  key={index}
                  className="p-4 sm:p-5 border border-gray-200 rounded-xl shadow-sm bg-white"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                    <h3 className="text-base font-semibold text-gray-900">
                      Output {index + 1}
                    </h3>
                    {form.outputDetails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOutputDetail(index)}
                        className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md px-2 py-1 transition"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Form Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Item Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Name <span className="text-red-500">*</span>
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
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select item</option>
                        {itemNames.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={output.productQty?.toString().replace(/^0+(?=\d)/, "") || ""}
                        onChange={(e) =>
                          handleOutputDetailChange(
                            index,
                            "productQty",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit <span className="text-red-500">*</span>
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
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {outputUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      placeholder="Optional notes"
                      value={output.notes || ""}
                      rows={3}
                      onChange={(e) =>
                        handleOutputDetailChange(index, "notes", e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    />
                  </div>

                  {/* Error Message */}
                  {errors.outputDetails && errors.outputDetails[index] && (
                    <p className="mt-2 text-xs text-red-600">
                      {errors.outputDetails[index]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Attachments */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <DocumentIcon className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
          </div>

          {/* Existing Attachments */}
          {existingAttachments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Existing Attachments
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingAttachments.map((file, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openPreview(file, true)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExistingAttachment(file._id)}
                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Attachments */}
          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                New Attachments
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {filePreviews[file.name] && (
                      <div className="mb-3">
                        <img
                          src={filePreviews[file.name]}
                          alt={file.name}
                          className="w-full h-24 object-cover rounded border"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openPreview(file, false)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <PhotoIcon className="w-4 h-4" />
              Choose Images
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => setCameraModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <CameraIcon className="w-4 h-4" />
              Take Photo
            </button>
            <p className="text-xs text-gray-500">
              Only image files under 2MB are allowed
            </p>
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <DocumentIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Remarks</h2>
          </div>

          <textarea
            placeholder="Add any additional notes or remarks about this production..."
            value={form.remarks}
            onChange={(e) => handleInputChange("remarks", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-6">
          <button
            type="button"
            onClick={() => navigate(`/productions/${id}`)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Updating...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Update Production
              </>
            )}
          </button>
        </div>
      </form>

      {/* Camera Modal */}
      <PhotoCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header - Fixed */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0">
                  {getFileIcon(previewModal.file)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                    {previewModal.file?.fileName || previewModal.file?.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {previewModal.file &&
                      (
                        (previewModal.file?.fileSize ||
                          previewModal.file?.size) /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                    MB •{" "}
                    {previewModal.file?.fileType || previewModal.file?.type}
                  </p>
                </div>
              </div>
              <button
                onClick={closePreviewModal}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
                title="Close preview"
              >
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 bg-gray-50">
              {previewModal.previewUrl ? (
                <div className="flex justify-center items-center min-h-full">
                  <img
                    src={previewModal.previewUrl}
                    alt={previewModal.file?.fileName || previewModal.file?.name}
                    className="max-w-full max-h-full object-contain rounded border shadow-sm bg-white"
                  />
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <DocumentIcon className="w-16 h-16 sm:w-24 sm:h-24 text-gray-500 mx-auto mb-4" />
                  <h4 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                    File Preview
                  </h4>
                  <p className="text-gray-600 text-sm sm:text-base px-4">
                    Preview not available for this file type.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer - Fixed */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 border-t border-gray-200 bg-white flex-shrink-0 gap-3 sm:gap-0">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                {previewModal.isExisting
                  ? "Existing attachment"
                  : "New attachment"}
              </div>
              <div className="flex gap-2 justify-center sm:justify-end">
                <button
                  onClick={closePreviewModal}
                  className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProductionPage;
