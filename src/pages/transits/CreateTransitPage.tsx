import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { transitService } from "../../services/transitService";
import { godownService } from "../../services/godownService";
import { userService } from "../../services/userService";
import { orderService } from "../../services/orderService";
import type {
  CreateTransitForm,
  ProductDetail,
  Godown,
  User,
  QuickProduct,
} from "../../types";
import {
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  CubeIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import PhotoCaptureModal from "../../components/common/PhotoCaptureModal";

interface ValidationErrors {
  productDetails?: string[];
  fromLocation?: string;
  toLocation?: string;
  dateOfDispatch?: string;
  expectedArrivalDate?: string;
  vehicleNumber?: string;
  driverId?: string;
  assignedTo?: string;
}

const CreateTransitPage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTransitForm>({
    productDetails: [
      {
        productName: "",
        quantity: 0,
        unit: "KG",
        additionalNote: "",
      },
    ],
    fromLocation: "",
    toLocation: "",
    dateOfDispatch: "",
    expectedArrivalDate: "",
    vehicleNumber: "",
    vehicleType: "",
    driverId: "",
    assignedTo: "",
    transporterName: "",
    remarks: "",
    attachments: [],
  });

  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [godownsLoading, setGodownsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>(
    {}
  );
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    file: File | null;
    previewUrl: string | null;
  }>({
    isOpen: false,
    file: null,
    previewUrl: null,
  });
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  useEffect(() => {
    loadGodowns();
    loadUsers();
    loadProducts();
  }, []);

  const loadGodowns = async () => {
    try {
      setGodownsLoading(true);
      const res = await godownService.getGodowns();
      if (res.success && res.data) {
        setGodowns(res.data.godowns || []);
      }
    } catch (err) {
      console.error("Failed to load godowns:", err);
      toast.error("Failed to load godowns");
    } finally {
      setGodownsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await userService.getUsers({ limit: 100 });
      if (res.success && res.data) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      const productList = await orderService.getQuickProducts();
      setProducts(productList);
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  // Extract unique product names from the products list
  const getUniqueProductNames = (): string[] => {
    const uniqueNames = new Set<string>();
    products.forEach((product) => {
      if (product.name && product.name.trim()) {
        uniqueNames.add(product.name.trim());
      }
    });
    return Array.from(uniqueNames).sort();
  };

  const validateProductDetail = (
    product: any,
    index: number
  ): string | undefined => {
    if (!product.productName || !product.productName.trim()) {
      return `Product ${index + 1}: Product name is required`;
    }
    if (product.productName.trim().length < 2) {
      return `Product ${index + 1}: Product name must be at least 2 characters`;
    }
    if (!product.quantity || product.quantity <= 0) {
      return `Product ${index + 1}: Quantity must be greater than 0`;
    }
    if (!product.unit || !product.unit.trim()) {
      return `Product ${index + 1}: Unit is required`;
    }
    return undefined;
  };

  const validateProductDetails = (productDetails: any[]): string[] => {
    if (!productDetails || productDetails.length === 0) {
      return ["At least one product is required"];
    }

    const errors: string[] = [];
    productDetails.forEach((product, index) => {
      const error = validateProductDetail(product, index);
      if (error) {
        errors.push(error);
      }
    });

    return errors;
  };

  const validateField = (field: string, value: any): string | undefined => {
    switch (field) {
      case "fromLocation":
        if (!value || !value.trim()) return "From location is required";
        break;
      case "toLocation":
        if (!value || !value.trim()) return "To location is required";
        break;
      case "driverId":
        if (!value || !value.trim()) return "Driver is required";
        break;
      case "assignedTo":
        if (!value || !value.trim()) return "Assigned to is required";
        break;
      case "dateOfDispatch":
      case "expectedArrivalDate": {
        if (!value || !value.trim()) {
          if (field === "dateOfDispatch") {
            return "Dispatch date is required";
          }
          break; // expectedArrivalDate is optional
        }

        const selectedDate = new Date(value);
        const today = new Date(new Date().toDateString());
        const dispatchDate = form.dateOfDispatch
          ? new Date(form.dateOfDispatch)
          : null;

        // Check 1: Dispatch date cannot be in the past
        if (field === "dateOfDispatch" && selectedDate < today) {
          return "Dispatch date cannot be in the past";
        }

        // Check 2: Expected arrival must be after dispatch date
        if (
          field === "expectedArrivalDate" &&
          dispatchDate &&
          selectedDate < dispatchDate
        ) {
          return "Expected arrival date must be after dispatch date";
        }

        break;
      }
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const productErrors = validateProductDetails(form.productDetails);
    if (productErrors.length > 0) {
      newErrors.productDetails = productErrors;
    }

    newErrors.fromLocation = validateField("fromLocation", form.fromLocation);
    newErrors.toLocation = validateField("toLocation", form.toLocation);
    newErrors.dateOfDispatch = validateField(
      "dateOfDispatch",
      form.dateOfDispatch
    );
    newErrors.vehicleNumber = validateField(
      "vehicleNumber",
      form.vehicleNumber
    );
newErrors.driverId = validateField(
      "driverId",
      form.driverId
    );
    newErrors.assignedTo = validateField(
      "assignedTo",
      form.assignedTo
    );
    // Remove undefined errors
    Object.keys(newErrors).forEach((key) => {
      if (!newErrors[key as keyof ValidationErrors]) {
        delete newErrors[key as keyof ValidationErrors];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType =
        file.type === "application/pdf" || file.type.startsWith("image/");
      const isValidSize = file.size <= 2 * 1024 * 1024; // 2MB

      if (!isValidType) {
        toast.error(
          `${file.name} is not a valid file type. Only PDF and images are allowed.`
        );
        return false;
      }

      if (!isValidSize) {
        toast.error(`${file.name} is too large. Maximum size is 2MB.`);
        return false;
      }

      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Generate previews for images
    validFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews((prev) => ({
            ...prev,
            [file.name]: e.target?.result as string,
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== fileName));
    setFilePreviews((prev) => {
      const newPreviews = { ...prev };
      delete newPreviews[fileName];
      return newPreviews;
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") {
      return <DocumentIcon className="w-8 h-8 text-red-500" />;
    } else if (file.type.startsWith("image/")) {
      return <PhotoIcon className="w-8 h-8 text-blue-500" />;
    }
    return <DocumentIcon className="w-8 h-8 text-gray-500" />;
  };

  const openPreviewModal = (file: File) => {
    let previewUrl = null;

    if (file.type.startsWith("image/")) {
      previewUrl = filePreviews[file.name];
    } else if (file.type === "application/pdf") {
      // Create a blob URL for PDF preview
      previewUrl = URL.createObjectURL(file);
    }

    setPreviewModal({
      isOpen: true,
      file,
      previewUrl,
    });
  };

  const closePreviewModal = () => {
    // Clean up blob URL if it exists
    if (
      previewModal.previewUrl &&
      previewModal.previewUrl.startsWith("blob:")
    ) {
      URL.revokeObjectURL(previewModal.previewUrl);
    }

    setPreviewModal({
      isOpen: false,
      file: null,
      previewUrl: null,
    });
  };

  const handleCameraCapture = (imageData: string, imageFile: File) => {
    // Add the captured image to selected files
    setSelectedFiles((prev) => [...prev, imageFile]);

    // Generate preview for the captured image
    setFilePreviews((prev) => ({
      ...prev,
      [imageFile.name]: imageData,
    }));

    toast.success("Photo captured successfully!");
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    const error = validateField(field, value);
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const updateProductDetail = (
    index: number,
    field: keyof ProductDetail,
    value: any
  ) => {
    setForm((prev) => ({
      ...prev,
      productDetails: prev.productDetails.map((product, i) =>
        i === index ? { ...product, [field]: value } : product
      ),
    }));

    // Clear product errors when updating
    setErrors((prev) => ({
      ...prev,
      productDetails: undefined,
    }));
  };

  const addProduct = () => {
    setForm((prev) => ({
      ...prev,
      productDetails: [
        ...prev.productDetails,
        {
          productName: "",
          quantity: 0,
          unit: "KG",
          additionalNote: "",
        },
      ],
    }));
  };

  const removeProduct = (index: number) => {
    if (form.productDetails.length > 1) {
      setForm((prev) => ({
        ...prev,
        productDetails: prev.productDetails.filter((_, i) => i !== index),
      }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = (form as any)[field];
    const error = validateField(field, value);
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (saving) {
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the validation errors or fill all the required fields before submitting");
      return;
    }

    setSaving(true);
    try {
      const formWithFiles = {
        ...form,
        attachments: selectedFiles,
      };
      const created = await transitService.createTransit(formWithFiles);
      toast.success("Transit created successfully!");
      navigate("/transits");
    } catch (error: any) {
      console.error("Failed to create transit:", error);
      toast.error(
        error?.message || "Failed to create transit. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (field: string) => {
    return touched[field] && errors[field as keyof ValidationErrors];
  };

  const drivers = users.filter(
    (user) =>
      user.department === "Warehouse" ||
      user.role.name.toLowerCase().includes("driver") ||
      user.position.toLowerCase().includes("driver")
  );
  const managers = users.filter(
    (user) =>
      user.role.name.toLowerCase().includes("manager") ||
      user.position.toLowerCase().includes("manager")
  );
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Create New Transit
                </h1>
                <p className="text-sm text-gray-600">
                  Add product transit information
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/transits")}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={saving} className="space-y-6">
            {/* Product Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CubeIcon className="w-5 h-5 text-gray-600" />
                    <h2 className="text-lg font-medium text-gray-900">
                      Product Information
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={addProduct}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add Product
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {form.productDetails.map((product, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 relative"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-md font-medium text-gray-900">
                        Product {index + 1}
                      </h3>
                      {form.productDetails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        {productsLoading ? (
                          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                            Loading products...
                          </div>
                        ) : (
                          <select
                            value={product.productName}
                            onChange={(e) =>
                              updateProductDetail(
                                index,
                                "productName",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select a product</option>
                            {getUniqueProductNames().map((productName) => (
                              <option key={productName} value={productName}>
                                {productName}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.quantity?.toString().replace(/^0+(?=\d)/, "") || ""}
                          onChange={(e) =>
                            updateProductDetail(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter quantity"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={product.unit}
                          onChange={(e) =>
                            updateProductDetail(index, "unit", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="KG">KG</option>
                          <option value="Quintal">Quintal</option>
                          <option value="Ton">Ton</option>
                          <option value="Bags">Bags</option>
                          <option value="40Kg Bags">40Kg Bags</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Additional Note
                        </label>
                        <input
                          type="text"
                          value={product.additionalNote || ""}
                          onChange={(e) =>
                            updateProductDetail(
                              index,
                              "additionalNote",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Additional notes (optional)"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {errors.productDetails && (
                  <div className="space-y-1">
                    {errors.productDetails.map((error, index) => (
                      <p
                        key={index}
                        className="text-sm text-red-600 flex items-center gap-1"
                      >
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-medium text-gray-900">
                    Location Information
                  </h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter from location"
                      value={form.fromLocation}
                      onChange={(e) =>
                        updateField("fromLocation", e.target.value)
                      }
                      onBlur={() => handleBlur("fromLocation")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError("fromLocation")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                    />
                    {getFieldError("fromLocation") && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {getFieldError("fromLocation")}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.toLocation}
                      onChange={(e) =>
                        updateField("toLocation", e.target.value)
                      }
                      onBlur={() => handleBlur("toLocation")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError("toLocation")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      disabled={godownsLoading}
                    >
                      <option value="">Select to location</option>
                      {godowns.map((godown) => (
                        <option key={godown._id} value={godown?._id}>
                          {godown.name} - {godown.location.city},{" "}
                          {godown.location.state}
                        </option>
                      ))}
                    </select>
                    {getFieldError("toLocation") && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {getFieldError("toLocation")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-medium text-gray-900">
                    Schedule Information
                  </h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dispatch Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.dateOfDispatch}
                      onChange={(e) =>
                        updateField("dateOfDispatch", e.target.value)
                      }
                      onBlur={() => handleBlur("dateOfDispatch")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError("dateOfDispatch")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                    />
                    {getFieldError("dateOfDispatch") && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {getFieldError("dateOfDispatch")}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Arrival Date
                    </label>
                    <input
                      type="date"
                      value={form.expectedArrivalDate}
                      onChange={(e) =>
                        updateField("expectedArrivalDate", e.target.value)
                      }
                      onBlur={() => handleBlur("expectedArrivalDate")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError("expectedArrivalDate")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                    />
                    {getFieldError("expectedArrivalDate") && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {getFieldError("expectedArrivalDate")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Transport Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <TruckIcon className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-medium text-gray-900">
                    Transport Information
                  </h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.vehicleNumber}
                      onChange={(e) =>
                        updateField(
                          "vehicleNumber",
                          e.target.value.toUpperCase()
                        )
                      }
                      onBlur={() => handleBlur("vehicleNumber")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError("vehicleNumber")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter vehicle number"
                    />
                    {getFieldError("vehicleNumber") && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {getFieldError("vehicleNumber")}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Type
                    </label>
                    <select
                      value={form.vehicleType}
                      onChange={(e) =>
                        updateField("vehicleType", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select vehicle type</option>
                      <option value="Truck">Truck</option>
                      <option value="Mini Truck">Mini Truck</option>
                      <option value="Van">Van</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Driver <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.driverId}
                      onChange={(e) => updateField("driverId", e.target.value)}
                      onBlur={() => handleBlur("driverId")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError("driverId")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      disabled={usersLoading}
                    >
                      <option value="">Select driver</option>
                      {drivers.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.firstName} {user.lastName} - {user.position}
                        </option>
                      ))}
                    </select>
                    {getFieldError("driverId") && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {getFieldError("driverId")}
                      </p>
                    )}
                  </div>
                  {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transporter Name
                  </label>
                  <input
                    type="text"
                    value={form.transporterName || ''}
                    onChange={(e) => updateField('transporterName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter transporter name"
                  />
                </div> */}
                </div>
              </div>
            </div>

            {/* Assignment Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-medium text-gray-900">
                    Assignment Information
                  </h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned To <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.assignedTo}
                      onChange={(e) =>
                        updateField("assignedTo", e.target.value)
                      }
                      onBlur={() => handleBlur("assignedTo")}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        getFieldError("assignedTo")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      disabled={usersLoading}
                    >
                      <option value="">Select assignee</option>
                      {managers.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.firstName} {user.lastName} - {user.position}
                        </option>
                      ))}
                    </select>
                    {getFieldError("assignedTo") && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {getFieldError("assignedTo")}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    value={form.remarks || ""}
                    onChange={(e) => updateField("remarks", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional remarks or notes"
                  />
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <DocumentIcon className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Attachments
                </h3>
              </div>

              <div className="space-y-4">
                {/* File Upload and Camera Capture Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {/* File Upload Option */}
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <DocumentIcon className="h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                          Upload Files
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, PNG, JPG, GIF up to 2MB each
                        </p>
                      </div>
                    </label>

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-16 bg-gray-300"></div>
                    <div className="sm:hidden w-16 h-px bg-gray-300"></div>

                    {/* Camera Capture Option */}
                    <button
                      type="button"
                      onClick={() => setCameraModalOpen(true)}
                      className="cursor-pointer flex flex-col items-center hover:text-blue-600 transition-colors"
                    >
                      <CameraIcon className="h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                          Take Photo
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Capture with camera
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Selected Files ({selectedFiles.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="relative bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              {getFileIcon(file)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => openPreviewModal(file)}
                                className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                title="Preview file"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFile(file.name)}
                                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Remove file"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Image Preview */}
                          {file.type.startsWith("image/") &&
                            filePreviews[file.name] && (
                              <div className="mt-3">
                                <img
                                  src={filePreviews[file.name]}
                                  alt={file.name}
                                  className="w-full h-24 object-cover rounded border"
                                />
                              </div>
                            )}

                          {/* PDF Preview Placeholder */}
                          {file.type === "application/pdf" && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-center">
                              <DocumentIcon className="w-6 h-6 text-red-500 mx-auto mb-1" />
                              <p className="text-xs text-red-600">
                                PDF Document
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Transit...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Create Transit</span>
                  </div>
                )}
              </button>
            </div>

            {/* Helper Text */}
            <div className="text-center pb-2">
              <p className="text-sm text-gray-500">
                Fields marked with <span className="text-red-500">*</span> are
                required
              </p>
            </div>
          </fieldset>
        </form>
      </div>

      {/* File Preview Modal */}
      {previewModal.isOpen && previewModal.file && (
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
                    {previewModal.file.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {(previewModal.file.size / 1024 / 1024).toFixed(2)} MB •{" "}
                    {previewModal.file.type}
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
              {previewModal.file.type.startsWith("image/") &&
              previewModal.previewUrl ? (
                <div className="flex justify-center items-center min-h-full">
                  <img
                    src={previewModal.previewUrl}
                    alt={previewModal.file.name}
                    className="max-w-full max-h-full object-contain rounded border shadow-sm bg-white"
                  />
                </div>
              ) : previewModal.file.type === "application/pdf" &&
                previewModal.previewUrl ? (
                <div className="h-full">
                  <iframe
                    src={previewModal.previewUrl}
                    className="w-full h-full min-h-[500px] border-0 rounded"
                    title={`PDF Preview: ${previewModal.file.name}`}
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
                File will be attached to your transit request
              </div>
              <div className="flex gap-2 justify-center sm:justify-end">
                <button
                  onClick={() => removeFile(previewModal.file!.name)}
                  className="px-3 sm:px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200"
                >
                  Remove File
                </button>
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

      {/* Photo Capture Modal */}
      <PhotoCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title="Capture Transit Photo"
        instructions="Take a photo to attach to your transit request"
      />
    </div>
  );
};

export default CreateTransitPage;
