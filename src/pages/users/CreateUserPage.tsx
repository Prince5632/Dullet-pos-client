import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Select from 'react-select';
import {
  ArrowLeftIcon,
  CameraIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { userService } from '../../services/userService';
import type { CreateUserForm, Godown } from '../../types';
import { apiService } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { cn, isValidEmail, isValidPhone } from '../../utils';
import RoleAssignment from '../../components/permissions/RoleAssignment';
import toast from 'react-hot-toast';
import { resolveImageSrc } from '../../utils/image';

// Validation schema
const createUserSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .test('valid-email', 'Please enter a valid email address', isValidEmail),
  phone: yup
    .string()
    .required('Phone number is required')
    .test('valid-phone', 'Please enter a valid Indian mobile number', isValidPhone),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  roleId: yup
    .string()
    .required('Role is required'),
  department: yup
    .string()
    .required('Department is required'),
  position: yup
    .string()
    .required('Position is required')
    .min(2, 'Position must be at least 2 characters')
    .max(100, 'Position must be less than 100 characters'),
});

const CreateUserPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>('');
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedPrimaryGodownId, setSelectedPrimaryGodownId] = useState<string>('');
  const [selectedAccessibleGodownIds, setSelectedAccessibleGodownIds] = useState<string[]>([]);

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CreateUserForm & { confirmPassword: string }>({
    resolver: yupResolver(createUserSchema) as any,
    mode: 'onBlur',
  });

  // No need to load roles separately as RoleAssignment component handles it

  // Load godowns
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get<{ godowns: Godown[] }>(API_CONFIG.ENDPOINTS.GODOWNS);
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
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
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
    setProfilePhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submission
  const onSubmit = async (data: CreateUserForm & { confirmPassword: string }) => {
    try {
      setLoading(true);

      const userData: CreateUserForm = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        roleId: data.roleId,
        department: data.department,
        position: data.position,
        profilePhoto: profilePhoto || undefined,
        primaryGodownId: selectedPrimaryGodownId || undefined,
        accessibleGodownIds: selectedAccessibleGodownIds,
      };

      await userService.createUser(userData);
      toast.success('User created successfully');
      navigate('/users');
    } catch (error: any) {
      console.error('Failed to create user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/users')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to Users
        </button>
        <div className="h-6 border-l border-gray-300"></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
          <p className="text-gray-600">Add a new user to your organization</p>
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
                      src={resolveImageSrc(profilePhotoPreview) || profilePhotoPreview}
                      alt="Profile preview"
                      className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                    <PhotoIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  Choose Photo
                </button>
                <p className="text-sm text-gray-500">
                  JPG, PNG up to 5MB
                </p>
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
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  {...register('firstName')}
                  className={cn(
                    'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm',
                    errors.firstName 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  )}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  {...register('lastName')}
                  className={cn(
                    'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm',
                    errors.lastName 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  )}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  {...register('email')}
                  className={cn(
                    'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm',
                    errors.email 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  )}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  {...register('phone')}
                  className={cn(
                    'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm',
                    errors.phone 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  )}
                  placeholder="Enter 10-digit mobile number"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Security Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Security Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    {...register('password')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm',
                      errors.password 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-300 focus:border-blue-500'
                    )}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    {...register('confirmPassword')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm',
                      errors.confirmPassword 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-300 focus:border-blue-500'
                    )}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Work Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <Select
                  id="department"
                  value={departments.find(dept => dept === watch('department')) ? { value: watch('department'), label: watch('department') } : null}
                  onChange={(option) => setValue('department', option?.value || '')}
                  options={departments.map(dept => ({ value: dept, label: dept }))}
                  placeholder="Select department"
                  isClearable
                  className="mt-1"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: errors.department ? '#f87171' : state.isFocused ? '#3b82f6' : '#d1d5db',
                      boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                      '&:hover': {
                        borderColor: errors.department ? '#f87171' : '#3b82f6'
                      }
                    })
                  }}
                />
                {errors.department && (
                  <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
                )}
              </div>

              {/* Position */}
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  Position *
                </label>
                <input
                  type="text"
                  id="position"
                  {...register('position')}
                  className={cn(
                    'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm',
                    errors.position 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-gray-300 focus:border-blue-500'
                  )}
                  placeholder="Enter position/job title"
                />
                {errors.position && (
                  <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
                )}
              </div>

              {/* Role */}
              <div className="md:col-span-2">
                <RoleAssignment
                  selectedRoleId={watch('roleId')}
                  onRoleChange={(roleId) => setValue('roleId', roleId || '')}
                  label="Role *"
                  placeholder="Select a role for this user"
                  error={errors.roleId?.message}
                  showPermissions={true}
                />
              </div>

              {/* Godown Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Godown</label>
                <Select
                  value={godowns.find(g => g._id === selectedPrimaryGodownId) ? { value: selectedPrimaryGodownId, label: `${godowns.find(g => g._id === selectedPrimaryGodownId)?.name} (${godowns.find(g => g._id === selectedPrimaryGodownId)?.location.city}${godowns.find(g => g._id === selectedPrimaryGodownId)?.location.area ? ` - ${godowns.find(g => g._id === selectedPrimaryGodownId)?.location.area}` : ''})` } : null}
                  onChange={(option) => setSelectedPrimaryGodownId(option?.value || '')}
                  options={godowns.map(g => ({ 
                    value: g._id, 
                    label: `${g.name} (${g.location.city}${g.location.area ? ` - ${g.location.area}` : ''})` 
                  }))}
                  placeholder="Select primary godown"
                  isClearable
                  className="mt-1"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
                      boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                      '&:hover': {
                        borderColor: '#3b82f6'
                      }
                    })
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Accessible Godowns</label>
                <Select
                  isMulti
                  value={selectedAccessibleGodownIds.map(id => {
                    const godown = godowns.find(g => g._id === id);
                    return godown ? { 
                      value: id, 
                      label: `${godown.name} (${godown.location.city}${godown.location.area ? ` - ${godown.location.area}` : ''})` 
                    } : null;
                  }).filter(Boolean)}
                  onChange={(options) => setSelectedAccessibleGodownIds(options ? options.map(option => option.value) : [])}
                  options={godowns.map(g => ({ 
                    value: g._id, 
                    label: `${g.name} (${g.location.city}${g.location.area ? ` - ${g.location.area}` : ''})` 
                  }))}
                  placeholder="Select accessible godowns"
                  className="mt-1"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
                      boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                      '&:hover': {
                        borderColor: '#3b82f6'
                      }
                    })
                  }}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading || isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating User...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserPage;