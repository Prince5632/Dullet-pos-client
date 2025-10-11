import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productionService } from "../../services/productionService";
import { userService } from "../../services/userService";
import type {
  CreateProductionForm,
  User,
} from "../../types";
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

const CreateProductionPage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateProductionForm>({
    productionDate: new Date().toISOString().split('T')[0],
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
    ],
    remarks: "",
    attachments: [],
  });

  const [operators, setOperators] = useState<User[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
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
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadOperators();
    // Automatically fetch location when component mounts
    fetchCurrentLocation();
  }, []);

  const loadOperators = async () => {
    try {
      setOperatorsLoading(true);
      const res = await userService.getUsers({
        role: "Operator",
        isActive: "true",
        limit: 100,
      });
      if (res.success && res.data) {
        setOperators(res.data.users || []);
      }
    } catch (error) {
      console.error("Failed to load operators:", error);
      toast.error("Failed to load operators");
    } finally {
      setOperatorsLoading(false);
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
            setForm((prev) => ({ ...prev, location: address }));
            toast.success("Location fetched successfully");
          } else {
            // Fallback to coordinates if reverse geocoding fails
            const coordsAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setForm((prev) => ({ ...prev, location: coordsAddress }));
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

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
      // Using OpenStreetMap Nominatim API for reverse geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Dullet-POS-App/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      
      if (data && data.display_name) {
        // Extract relevant parts of the address
        const address = data.address;
        let formattedAddress = '';

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
          
          formattedAddress = parts.join(', ');
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

    

    if (!form.operator) {
      newErrors.operator = "Operator is required";
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

    // Output details validation
    const outputErrors: string[] = [];
    form.outputDetails.forEach((output, index) => {
      if (!output.itemName.trim()) {
        outputErrors[index] = `Output ${index + 1}: Item name is required`;
      } else if (!output.productQty || output.productQty <= 0) {
        outputErrors[index] = `Output ${index + 1}: Quantity must be greater than 0`;
      } else if (!output.productUnit.trim()) {
        outputErrors[index] = `Output ${index + 1}: Unit is required`;
      }
    });

    if (outputErrors.length > 0) {
      newErrors.outputDetails = outputErrors;
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

      const formData: CreateProductionForm = {
        ...form,
        attachments: selectedFiles,
      };

      const res = await productionService.createProduction(formData);

      if (res.success) {
        toast.success("Production created successfully");
        navigate("/productions");
      } else {
        throw new Error(res.message || "Failed to create production");
      }
    } catch (error: any) {
      console.error("Failed to create production:", error);
      toast.error(error.message || "Failed to create production");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof CreateProductionForm, value: any) => {
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
      const updatedOutputDetails = form.outputDetails.filter((_, i) => i !== index);
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
        errors.push(`Invalid file: ${file?.name || 'Unknown file'}`);
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
        errors.push(`${file.name}: File size must be under 2MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        return;
      }
      
      validFiles.push(file);
    });
    
    // Show errors if any
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
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
    e.target.value = '';
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

  const openPreview = (file: File) => {
    if (!file || !file.type) return;
    
    if (file.type.startsWith("image/")) {
      setPreviewModal({
        isOpen: true,
        file,
        previewUrl: filePreviews[file.name] || null,
      });
    }
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
      toast.error(`Captured image is too large: ${(imageFile.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 2MB`);
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

  const inputUnits = ["KG", "Quintal", "Ton"];
  const outputUnits = ["KG", "Quintal", "Ton", "Bags", "5Kg Bags", "40Kg Bags"];
  const itemNames = ["Atta", "Chokar"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/productions")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Production</h1>
          <p className="text-sm text-gray-600">
            Add a new production record to track manufacturing output
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
                onChange={(e) => handleInputChange("productionDate", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.productionDate ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.productionDate && (
                <p className="mt-1 text-xs text-red-600">{errors.productionDate}</p>
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
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
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
                  onChange={(e) => handleInputChange("location", e.target.value)}
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
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.location && (
                <p className="mt-1 text-xs text-red-600">{errors.location}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Click the location icon to automatically fetch your current address
              </p>
            </div>

            {/* Machine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Machine 
              </label>
              <input
                type="text"
                placeholder="Enter machine name/number"
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
                Operator *
              </label>
              <input
                type="text"
                placeholder="Enter operator name"
                value={form.operator}
                onChange={(e) => handleInputChange("operator", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.operator ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.operator && (
                <p className="mt-1 text-xs text-red-600">{errors.operator}</p>
              )}
            </div>
          </div>
        </div>

        {/* Input Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
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
                placeholder="Enter input material type"
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
                placeholder="Enter quantity"
                value={form.inputQty || ""}
                onChange={(e) => handleInputChange("inputQty", parseFloat(e.target.value) || 0)}
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">
                Output Details
              </h2>
            </div>
            <button
              type="button"
              onClick={addOutputDetail}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <PlusIcon className="w-4 h-4" />
              Add Output
            </button>
          </div>

          <div className="space-y-4">
            {form.outputDetails.map((output, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Output {index + 1}
                  </h3>
                  {form.outputDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOutputDetail(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <select
                      value={output.itemName}
                      onChange={(e) =>
                        handleOutputDetailChange(index, "itemName", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select item</option>
                      {itemNames.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter quantity"
                      value={output.productQty || ""}
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

                  {/* Product Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit *
                    </label>
                    <select
                      value={output.productUnit}
                      onChange={(e) =>
                        handleOutputDetailChange(index, "productUnit", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    placeholder="Enter additional notes for this output"
                    value={output.notes || ""}
                    onChange={(e) =>
                      handleOutputDetailChange(index, "notes", e.target.value)
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {errors.outputDetails && errors.outputDetails[index] && (
                  <p className="mt-2 text-xs text-red-600">
                    {errors.outputDetails[index]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <DocumentIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
          </div>

          <div className="space-y-4">
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

            {/* File List */}
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="relative p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {file.type.startsWith("image/") ? (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {filePreviews[file.name] && (
                            <img
                              src={filePreviews[file.name]}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <DocumentIcon className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {file.type.startsWith("image/") && (
                        <button
                          type="button"
                          onClick={() => openPreview(file)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <DocumentIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Remarks</h2>
          </div>

          <textarea
            placeholder="Enter any additional remarks or notes about this production"
            value={form.remarks}
            onChange={(e) => handleInputChange("remarks", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/productions")}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Creating..." : "Create Production"}
          </button>
        </div>
      </form>

      {/* Photo Capture Modal */}
      <PhotoCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Preview Modal */}
      {previewModal.isOpen && previewModal.previewUrl && (
        <div className="fixed inset-0 bg-black/10 p-4 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex sticky top-0 items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {previewModal.file?.name}
              </h3>
              <button
                onClick={() => setPreviewModal({ isOpen: false, file: null, previewUrl: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <img
              src={previewModal.previewUrl}
              alt={previewModal.file?.name}
              className="max-w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateProductionPage;