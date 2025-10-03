import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Select from "react-select";
import {
  ArrowLeftIcon,
  CameraIcon,
  XMarkIcon,
  DocumentArrowUpIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";

import { userService } from "../../services/userService";
import { roleService } from "../../services/roleService";
import type { UpdateUserForm, User, Role, Godown } from "../../types";
import { apiService } from "../../services/api";
import { API_CONFIG, UPLOAD_CONFIG } from "../../config/api";
import { cn, isValidEmail, isValidPhone } from "../../utils";
import Avatar from "../../components/ui/Avatar";
import RoleAssignment from "../../components/permissions/RoleAssignment";
import toast from "react-hot-toast";
import { resolveCapturedImageSrc, resolveProfileImageSrc, resolveDocumentSrc } from "../../utils/image";

// Validation schema (password is optional for updates)
const editUserSchema = yup.object({
  firstName: yup
    .string()
    .required("First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters"),
  lastName: yup
    .string()
    .required("Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters"),
  email: yup
    .string()
    .required("Email is required")
    .test("valid-email", "Please enter a valid email address", isValidEmail),
  phone: yup
    .string()
    .required("Phone number is required")
    .test(
      "valid-phone",
      "Please enter a valid Indian mobile number",
      isValidPhone
    ),
  roleId: yup.string().required("Role is required"),
  department: yup.string().required("Department is required"),
  position: yup
    .string()
    .required("Position is required")
    .min(2, "Position must be at least 2 characters")
    .max(100, "Position must be less than 100 characters"),
  aadhaarNumber: yup
    .string()
    .nullable()
    .transform((value) => (value ? value.trim() : undefined))
    .matches(/^[0-9]{12}$/, {
      message: "Aadhaar must be 12 digits",
      excludeEmptyString: true,
    }),
  panNumber: yup
    .string()
    .nullable()
    .transform((value) => (value ? value.trim().toUpperCase() : undefined))
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, {
      message: "Invalid PAN format",
      excludeEmptyString: true,
    }),
});

type UpdateUserFormInputs = UpdateUserForm & {
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressPincode?: string;
  addressCountry?: string;
  aadhaarNumber?: string;
  panNumber?: string;
};

const EditUserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>("");
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedPrimaryGodownId, setSelectedPrimaryGodownId] =
    useState<string>("");
  const [selectedAccessibleGodownIds, setSelectedAccessibleGodownIds] =
    useState<string[]>([]);
  const [aadhaarDocument, setAadhaarDocument] = useState<File | null>(null);
  const [panDocument, setPanDocument] = useState<File | null>(null);
  const [aadhaarDocumentPreview, setAadhaarDocumentPreview] =
    useState<string | null>(null);
  const [panDocumentPreview, setPanDocumentPreview] =
    useState<string | null>(null);
  const [aadhaarDocumentId, setAadhaarDocumentId] = useState<string | null>(null);
  const [panDocumentId, setPanDocumentId] = useState<string | null>(null);
  const [otherDocuments, setOtherDocuments] = useState<File[]>([]);
  const [otherDocumentPreviews, setOtherDocumentPreviews] = useState<string[]>([]);
  const [otherDocumentLabels, setOtherDocumentLabels] = useState<string[]>([]);
  const [existingOtherDocuments, setExistingOtherDocuments] = useState<
    { _id: string; label?: string; fileName?: string; url: string }[]
  >([]);
  const [removeDocumentIds, setRemoveDocumentIds] = useState<string[]>([]);
  const documentAcceptTypes = React.useMemo(() => {
    const mimeTypes = new Set(UPLOAD_CONFIG.ACCEPTED_DOCUMENT_TYPES);
    mimeTypes.add("image/jpeg");
    mimeTypes.add("image/png");
    mimeTypes.add("image/webp");
    mimeTypes.add("image/*");
    return Array.from(mimeTypes).join(",");
  }, []);
  const aadhaarDocumentInputRef = useRef<HTMLInputElement>(null);
  const panDocumentInputRef = useRef<HTMLInputElement>(null);

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
    watch,
  } = useForm<UpdateUserFormInputs>({
    resolver: yupResolver(editUserSchema) as any,
    mode: "onBlur",
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        navigate("/users");
        return;
      }

      try {
        setLoading(true);

        // Load user and roles in parallel
        const [userData, allRoles] = await Promise.all([
          userService.getUserById(id),
          roleService.getAllRoles(),
        ]);

        setUser(userData);
        setRoles(allRoles);
        setProfilePhotoPreview(userData.profilePhoto || "");
        setSelectedPrimaryGodownId((userData as any).primaryGodown?._id || "");
        setSelectedAccessibleGodownIds(
          ((userData as any).accessibleGodowns || []).map((g: Godown) => g._id)
        );

        const userAddress = (userData as any).address || {};
        setValue("addressLine1", userAddress.line1 || "");
        setValue("addressLine2", userAddress.line2 || "");
        setValue("addressCity", userAddress.city || "");
        setValue("addressState", userAddress.state || "");
        setValue("addressPincode", userAddress.pincode || "");
        setValue("addressCountry", userAddress.country || "");
        setValue("aadhaarNumber", (userData as any).aadhaarNumber || "");
        setValue("panNumber", (userData as any).panNumber || "");

        // Populate form with user data
        reset({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          roleId: userData.role?._id || "",
          department: userData.department,
          position: userData.position,
        });

        // Set the role ID in the form
        setValue("roleId", userData.role?._id || "");

        const aadhaarDoc = (userData as any).documents?.find(
          (doc: any) => doc.type === "aadhaar"
        );
        const panDoc = (userData as any).documents?.find(
          (doc: any) => doc.type === "pan"
        );
        setAadhaarDocumentPreview(
          aadhaarDoc && aadhaarDoc.url ? aadhaarDoc.url : null
        );
        setAadhaarDocumentId(aadhaarDoc?._id || null);
        setPanDocumentPreview(panDoc && panDoc.url ? panDoc.url : null);
        setPanDocumentId(panDoc?._id || null);

        const otherDocs = ((userData as any).documents || []).filter(
          (doc: any) => doc.type === "other"
        );
        setExistingOtherDocuments(
          otherDocs.map((doc: any) => ({
            _id: doc._id,
            label: doc.label,
            fileName: doc.fileName,
            url: doc.url,
          }))
        );
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load user data");
        navigate("/users");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate, reset]);

  // Load godowns
  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get<{ godowns: Godown[] }>(
          API_CONFIG.ENDPOINTS.GODOWNS
        );
        if (res.success && res.data) setGodowns(res.data.godowns);
      } catch {}
    })();
  }, []);

  // Departments
  const departments = userService.getDepartments();

  // Handle profile photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      setProfilePhoto(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(user?.profilePhoto || "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateDocumentFile = (file: File) => {
    const isValidType =
      UPLOAD_CONFIG.ACCEPTED_DOCUMENT_TYPES.includes(file.type) ||
      file.type.startsWith("image/");

    if (!isValidType) {
      toast.error("Unsupported file type. Use PDF, DOC, or image files.");
      return false;
    }

    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      toast.error("Document size must be less than 5MB");
      return false;
    }

    return true;
  };

  const handleAadhaarDocumentChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateDocumentFile(file)) {
      event.target.value = "";
      return;
    }

    setAadhaarDocument(file);
    setAadhaarDocumentId(null);
    if (aadhaarDocumentPreview) {
      URL.revokeObjectURL(aadhaarDocumentPreview);
    }
    setAadhaarDocumentPreview(
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    );
  };

  const handlePanDocumentChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateDocumentFile(file)) {
      event.target.value = "";
      return;
    }

    setPanDocument(file);
    setPanDocumentId(null);
    if (panDocumentPreview) {
      URL.revokeObjectURL(panDocumentPreview);
    }
    setPanDocumentPreview(
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    );
  };

  const clearAadhaarDocument = () => {
    if (aadhaarDocumentPreview && !aadhaarDocumentPreview.startsWith("http")) {
      URL.revokeObjectURL(aadhaarDocumentPreview);
    }
    setAadhaarDocument(null);
    setAadhaarDocumentPreview(null);
    setAadhaarDocumentId(null);
    if (aadhaarDocumentInputRef.current) {
      aadhaarDocumentInputRef.current.value = "";
    }
  };

  const clearPanDocument = () => {
    if (panDocumentPreview && !panDocumentPreview.startsWith("http")) {
      URL.revokeObjectURL(panDocumentPreview);
    }
    setPanDocument(null);
    setPanDocumentPreview(null);
    setPanDocumentId(null);
    if (panDocumentInputRef.current) {
      panDocumentInputRef.current.value = "";
    }
  };

  const addOtherDocuments = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    const newLabels: string[] = [];

    Array.from(files).forEach((file) => {
      if (!validateDocumentFile(file)) {
        return;
      }

      newFiles.push(file);
      if (file.type.startsWith("image/")) {
        newPreviews.push(URL.createObjectURL(file));
      } else {
        newPreviews.push("");
      }
      newLabels.push(file.name);
    });

    setOtherDocuments((prev) => [...prev, ...newFiles]);
    setOtherDocumentPreviews((prev) => [...prev, ...newPreviews]);
    setOtherDocumentLabels((prev) => [...prev, ...newLabels]);
  };

  const updateOtherDocumentLabel = (index: number, value: string) => {
    setOtherDocumentLabels((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const removeNewOtherDocument = (index: number) => {
    setOtherDocuments((prev) => prev.filter((_, idx) => idx !== index));
    setOtherDocumentPreviews((prev) => {
      const copy = [...prev];
      const preview = copy[index];
      if (preview) URL.revokeObjectURL(preview);
      copy.splice(index, 1);
      return copy;
    });
    setOtherDocumentLabels((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const removeExistingOtherDocument = (docId: string) => {
    setExistingOtherDocuments((prev) => prev.filter((doc) => doc._id !== docId));
    setRemoveDocumentIds((prev) => [...prev, docId]);
  };

  const updateExistingOtherDocumentLabel = (docId: string, value: string) => {
    setExistingOtherDocuments((prev) =>
      prev.map((doc) =>
        doc._id === docId
          ? {
              ...doc,
              label: value,
            }
          : doc
      )
    );
  };

  useEffect(() => {
    return () => {
      if (aadhaarDocumentPreview && !aadhaarDocumentPreview.startsWith("http")) {
        URL.revokeObjectURL(aadhaarDocumentPreview);
      }
      if (panDocumentPreview && !panDocumentPreview.startsWith("http")) {
        URL.revokeObjectURL(panDocumentPreview);
      }
      otherDocumentPreviews.forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [aadhaarDocumentPreview, panDocumentPreview, otherDocumentPreviews]);

  // Handle form submission
  const onSubmit = async (data: UpdateUserFormInputs) => {
    if (!user) return;

    try {
      setSaving(true);

      const userData: UpdateUserForm = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        roleId: data.roleId || undefined,
        department: data.department,
        position: data.position,
        profilePhoto: profilePhoto || undefined,
        primaryGodownId: selectedPrimaryGodownId || undefined,
        accessibleGodownIds: selectedAccessibleGodownIds,
        address:
          data.addressLine1 ||
          data.addressLine2 ||
          data.addressCity ||
          data.addressState ||
          data.addressPincode ||
          data.addressCountry
            ? {
                line1: data.addressLine1 || undefined,
                line2: data.addressLine2 || undefined,
                city: data.addressCity || undefined,
                state: data.addressState || undefined,
                pincode: data.addressPincode || undefined,
                country: data.addressCountry || undefined,
              }
            : undefined,
        aadhaarNumber: data.aadhaarNumber || undefined,
        panNumber: data.panNumber || undefined,
        aadhaarDocument: aadhaarDocument || undefined,
        panDocument: panDocument || undefined,
      };

      if (otherDocuments.length) {
        userData.otherDocuments = otherDocuments;
        userData.otherDocumentsMeta = otherDocumentLabels.map((label, index) => ({
          label: label?.trim() || otherDocuments[index].name,
          type: "other",
        }));
      }

      if (existingOtherDocuments.length ) {
        userData.otherDocumentsMeta = [
          ...(userData.otherDocumentsMeta || []),
          ...existingOtherDocuments.map((doc) => ({
            _id: doc._id,
            label: doc.label?.trim() || doc.fileName || "Document",
            type: "other",
          })),
        ];
      }

      if (removeDocumentIds.length) {
        userData.removeDocumentIds = removeDocumentIds;
      }

      await userService.updateUser(user._id, userData);
      toast.success("User updated successfully");
      navigate(`/users/${user._id}`);
    } catch (error: any) {
      console.error("Failed to update user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading user data...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(`/users/${user._id}`)}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to User Details
        </button>
        <div className="h-6 border-l border-gray-300"></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit {user.firstName} {user.lastName}
          </h1>
          <p className="text-gray-600">Update user information and settings</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Profile Photo Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="relative">
                {profilePhotoPreview ? (
                  <div className="relative">
                    <img
                      src={
                        resolveProfileImageSrc(profilePhotoPreview) ||
                        profilePhotoPreview
                      }
                      alt="Profile preview"
                      className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                    />
                    {profilePhoto && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <Avatar
                    name={`${user.firstName} ${user.lastName}`}
                    size="xl"
                  />
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  {profilePhotoPreview ? "Change Photo" : "Upload Photo"}
                </button>
                <p className="text-sm text-gray-500">JPG, PNG up to 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700"
                >
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  {...register("firstName")}
                  className={cn(
                    "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm",
                    errors.firstName
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  )}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  {...register("lastName")}
                  className={cn(
                    "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm",
                    errors.lastName
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  )}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  {...register("email")}
                  className={cn(
                    "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm",
                    errors.email
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  )}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  {...register("phone")}
                  className={cn(
                    "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm",
                    errors.phone
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  )}
                  placeholder="Enter 10-digit mobile number"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Work Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department */}
              <div>
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-gray-700"
                >
                  Department *
                </label>
                <Select
                  id="department"
                  value={
                    departments.find((dept) => dept === watch("department"))
                      ? {
                          value: watch("department"),
                          label: watch("department"),
                        }
                      : null
                  }
                  onChange={(option) =>
                    setValue("department", option?.value as User["department"] || "")
                  }
                  options={departments.map((dept) => ({
                    value: dept,
                    label: dept,
                  }))}
                  placeholder="Select department"
                  isClearable
                  className="mt-1"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: errors.department
                        ? "#f87171"
                        : state.isFocused
                        ? "#3b82f6"
                        : "#d1d5db",
                      boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
                      "&:hover": {
                        borderColor: errors.department ? "#f87171" : "#3b82f6",
                      },
                    }),
                  }}
                />
                {errors.department && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.department.message}
                  </p>
                )}
              </div>

              {/* Position */}
              <div>
                <label
                  htmlFor="position"
                  className="block text-sm font-medium text-gray-700"
                >
                  Position *
                </label>
                <input
                  type="text"
                  id="position"
                  {...register("position")}
                  className={cn(
                    "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm",
                    errors.position
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  )}
                  placeholder="Enter position/job title"
                />
                {errors.position && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.position.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div className="md:col-span-2">
                <RoleAssignment
                  selectedRoleId={watch("roleId")}
                  onRoleChange={(roleId) => setValue("roleId", roleId || "")}
                  label="Role *"
                  placeholder="Select a role for this user"
                  error={errors.roleId?.message}
                  showPermissions={true}
                />
              </div>

              {/* Godown Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Primary Godown
                </label>
                <Select
                  value={
                    godowns.find((g) => g._id === selectedPrimaryGodownId)
                      ? {
                          value: selectedPrimaryGodownId,
                          label: `${
                            godowns.find(
                              (g) => g._id === selectedPrimaryGodownId
                            )?.name
                          } (${
                            godowns.find(
                              (g) => g._id === selectedPrimaryGodownId
                            )?.location.city
                          }${
                            godowns.find(
                              (g) => g._id === selectedPrimaryGodownId
                            )?.location.area
                              ? ` - ${
                                  godowns.find(
                                    (g) => g._id === selectedPrimaryGodownId
                                  )?.location.area
                                }`
                              : ""
                          })`,
                        }
                      : null
                  }
                  onChange={(option) =>
                    setSelectedPrimaryGodownId(option?.value || "")
                  }
                  options={godowns.map((g) => ({
                    value: g._id,
                    label: `${g.name} (${g.location.city}${
                      g.location.area ? ` - ${g.location.area}` : ""
                    })`,
                  }))}
                  placeholder="Select primary godown"
                  isClearable
                  className="mt-1"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
                      boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
                      "&:hover": {
                        borderColor: "#3b82f6",
                      },
                    }),
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Accessible Godowns
                </label>
                <Select
                  isMulti
                  value={selectedAccessibleGodownIds
                    .map((id) => {
                      const godown = godowns.find((g) => g._id === id);
                      return godown
                        ? {
                            value: id,
                            label: `${godown.name} (${godown.location.city}${
                              godown.location.area
                                ? ` - ${godown.location.area}`
                                : ""
                            })`,
                          }
                        : null;
                    })
                    .filter(Boolean)}
                  onChange={(options) =>
                    setSelectedAccessibleGodownIds(
                      options ? options.map((option) => option.value) : []
                    )
                  }
                  options={godowns.map((g) => ({
                    value: g._id,
                    label: `${g.name} (${g.location.city}${
                      g.location.area ? ` - ${g.location.area}` : ""
                    })`,
                  }))}
                  placeholder="Select accessible godowns"
                  className="mt-1"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
                      boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
                      "&:hover": {
                        borderColor: "#3b82f6",
                      },
                    }),
                  }}
                />
              </div>
            </div>
          </div>

          {/* Identification */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="aadhaarNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  id="aadhaarNumber"
                  {...register("aadhaarNumber")}
                  className={cn(
                    "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm",
                    errors.aadhaarNumber
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  )}
                  placeholder="Enter 12-digit Aadhaar number"
                  maxLength={12}
                />
                {errors.aadhaarNumber && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.aadhaarNumber.message as string}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="panNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  PAN Number
                </label>
                <input
                  type="text"
                  id="panNumber"
                  {...register("panNumber")}
                  className={cn(
                    "mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm",
                    errors.panNumber
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-blue-500"
                  )}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  onChange={(event) => {
                    const value = event.target.value.toUpperCase();
                    setValue("panNumber", value, { shouldValidate: true });
                  }}
                />
                {errors.panNumber && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.panNumber.message as string}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label
                  htmlFor="addressLine1"
                  className="block text-sm font-medium text-gray-700"
                >
                  Address Line 1
                </label>
                <input
                  type="text"
                  id="addressLine1"
                  {...register("addressLine1")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="House number, street"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="addressLine2"
                  className="block text-sm font-medium text-gray-700"
                >
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="addressLine2"
                  {...register("addressLine2")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="Apartment, suite, landmark"
                />
              </div>

              <div>
                <label
                  htmlFor="addressCity"
                  className="block text-sm font-medium text-gray-700"
                >
                  City
                </label>
                <input
                  type="text"
                  id="addressCity"
                  {...register("addressCity")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="City"
                />
              </div>

              <div>
                <label
                  htmlFor="addressState"
                  className="block text-sm font-medium text-gray-700"
                >
                  State
                </label>
                <input
                  type="text"
                  id="addressState"
                  {...register("addressState")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="State"
                />
              </div>

              <div>
                <label
                  htmlFor="addressPincode"
                  className="block text-sm font-medium text-gray-700"
                >
                  PIN Code
                </label>
                <input
                  type="text"
                  id="addressPincode"
                  {...register("addressPincode")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="6-digit PIN"
                  maxLength={6}
                />
              </div>

              <div>
                <label
                  htmlFor="addressCountry"
                  className="block text-sm font-medium text-gray-700"
                >
                  Country
                </label>
                <input
                  type="text"
                  id="addressCountry"
                  {...register("addressCountry")}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          {/* Documents Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Aadhaar Document
                </label>
                <label
                  className="mt-1 flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  htmlFor="editAadhaarDocumentInput"
                >
                  {aadhaarDocumentPreview ? (
                    <img
                      src={aadhaarDocumentPreview}
                      alt="Aadhaar preview"
                      className="h-32 w-full object-cover rounded-md"
                    />
                  ) : (
                    <>
                      <DocumentArrowUpIcon className="h-8 w-8 text-gray-400" />
                      <span className="mt-2 text-sm text-gray-600">
                        {aadhaarDocument
                          ? aadhaarDocument.name
                          : "Upload Aadhaar (image or PDF)"}
                      </span>
                    </>
                  )}
                </label>
                <input
                  id="editAadhaarDocumentInput"
                  ref={aadhaarDocumentInputRef}
                  type="file"
                  accept={documentAcceptTypes}
                  onChange={handleAadhaarDocumentChange}
                  className="hidden"
                />
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <PaperClipIcon className="h-4 w-4" /> PDF or image, up to 5MB
                </p>
                {(aadhaarDocument || aadhaarDocumentPreview) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (aadhaarDocumentId) {
                        setRemoveDocumentIds((prev) => [...prev, aadhaarDocumentId]);
                      }
                      clearAadhaarDocument();
                    }}
                    className="mt-2 text-xs text-red-600 hover:underline"
                  >
                    Remove file
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  PAN Document
                </label>
                <label
                  className="mt-1 flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  htmlFor="editPanDocumentInput"
                >
                  {panDocumentPreview ? (
                    <img
                      src={panDocumentPreview}
                      alt="PAN preview"
                      className="h-32 w-full object-cover rounded-md"
                    />
                  ) : (
                    <>
                      <DocumentArrowUpIcon className="h-8 w-8 text-gray-400" />
                      <span className="mt-2 text-sm text-gray-600">
                        {panDocument
                          ? panDocument.name
                          : "Upload PAN (image or PDF)"}
                      </span>
                    </>
                  )}
                </label>
                <input
                  id="editPanDocumentInput"
                  ref={panDocumentInputRef}
                  type="file"
                  accept={documentAcceptTypes}
                  onChange={handlePanDocumentChange}
                  className="hidden"
                />
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <PaperClipIcon className="h-4 w-4" /> PDF or image, up to 5MB
                </p>
                {(panDocument || panDocumentPreview) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (panDocumentId) {
                        setRemoveDocumentIds((prev) => [...prev, panDocumentId]);
                      }
                      clearPanDocument();
                    }}
                    className="mt-2 text-xs text-red-600 hover:underline"
                  >
                    Remove file
                  </button>
                )}
              </div>
            </div>

            <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Additional Documents
                  </h4>
                  <p className="text-xs text-gray-500">
                    Upload supporting files like ID proofs, agreements, etc. (PDF or Image)
                  </p>
                </div>
                <label className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <DocumentArrowUpIcon className="h-4 w-4 mr-1" />
                  Add Files
                  <input
                    type="file"
                    accept={documentAcceptTypes}
                    multiple
                    className="hidden"
                    onChange={(event) => addOtherDocuments(event.target.files)}
                  />
                </label>
              </div>

              {existingOtherDocuments.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Existing files</p>
                  <ul className="space-y-3">
                    {existingOtherDocuments.map((doc) => (
                      <li
                        key={doc._id}
                        className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <PaperClipIcon className="h-4 w-4 text-gray-400" />
                          <div>
                            <input
                              type="text"
                              value={doc.label || doc.fileName || "Document"}
                              onChange={(event) =>
                                updateExistingOtherDocumentLabel(doc._id, event.target.value)
                              }
                              className="block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                            <a
                              href={resolveDocumentSrc(doc.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingOtherDocument(doc._id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {otherDocuments.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2">New files</p>
                  <ul className="space-y-3">
                    {otherDocuments.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-start justify-between rounded-md border border-gray-200 px-3 py-2 gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <PaperClipIcon className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                              <input
                                type="text"
                                value={otherDocumentLabels[index] || file.name}
                                onChange={(event) =>
                                  updateOtherDocumentLabel(index, event.target.value)
                                }
                                className="block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                placeholder="Document label"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewOtherDocument(index)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : existingOtherDocuments.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No additional documents uploaded yet.
                </p>
              ) : null}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(`/users/${user._id}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving || isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating User...
                </>
              ) : (
                "Update User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserPage;
