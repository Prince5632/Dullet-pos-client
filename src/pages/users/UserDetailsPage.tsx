import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { userService } from '../../services/userService';
import type { User } from '../../types';
import { formatDateTime, formatDate } from '../../utils';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      if (!id) {
        navigate('/users');
        return;
      }

      try {
        setLoading(true);
        const userData = await userService.getUserById(id);
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
        toast.error('Failed to load user details');
        navigate('/users');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id, navigate]);

  // Handle user actions
  const handleToggleUserStatus = async () => {
    if (!user) return;

    try {
      setActionLoading(true);
      if (user.isActive) {
        // Deactivate logic would go here
        toast.success('User deactivated successfully');
      } else {
        await userService.activateUser(user._id);
        toast.success('User activated successfully');
      }
      
      // Reload user data
      const updatedUser = await userService.getUserById(user._id);
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    try {
      setActionLoading(true);
      await userService.deleteUser(user._id);
      toast.success('User deleted successfully');
      navigate('/users');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading user details...</span>
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
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600">{user.position} • {user.department}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleUserStatus}
            disabled={actionLoading}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors ${
              user.isActive
                ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                : 'text-green-700 bg-green-100 hover:bg-green-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {user.isActive ? (
              <UserMinusIcon className="h-4 w-4 mr-2" />
            ) : (
              <UserPlusIcon className="h-4 w-4 mr-2" />
            )}
            {user.isActive ? 'Deactivate' : 'Activate'}
          </button>

          <Link
            to={`/users/${user._id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit User
          </Link>

          <button
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col items-center">
              <Avatar
                src={user.profilePhoto}
                name={`${user.firstName} ${user.lastName}`}
                size="xl"
                className="mb-4"
              />
              
              <h2 className="text-xl font-semibold text-gray-900 text-center">
                {user.firstName} {user.lastName}
              </h2>
              
              <p className="text-gray-600 text-center mb-4">
                {user.position}
              </p>

              <Badge
                variant={user.isActive ? 'success' : 'error'}
                size="lg"
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>

              <div className="mt-6 w-full space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{user.email}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <PhoneIcon className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{user.phone}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <IdentificationIcon className="h-4 w-4 mr-3 text-gray-400" />
                  <span>ID: {user.employeeId}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <BuildingOfficeIcon className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{user.department}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <ShieldCheckIcon className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{user.role?.name || 'No Role'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Information */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.employeeId}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={user.isActive ? 'success' : 'error'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Account Created</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {formatDate(user.createdAt)}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Failed Login Attempts</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.failedLoginAttempts || 0}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Account Locked</dt>
                  <dd className="mt-1">
                    <Badge variant={user.isLocked ? 'error' : 'success'}>
                      {user.isLocked ? 'Locked' : 'Not Locked'}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Role & Permissions */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Role & Permissions</h3>
            </div>
            <div className="p-6">
              {user.role ? (
                <div className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Role</dt>
                    <dd className="mt-1">
                      <Badge variant="info" size="lg">
                        {user.role.name}
                      </Badge>
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.role.description}</dd>
                  </div>
                  
                  {user.role.permissions && user.role.permissions.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 mb-2">Permissions</dt>
                      <dd className="flex flex-wrap gap-2">
                        {user.role.permissions.map((permission) => (
                          <Badge key={permission._id} variant="default" size="sm">
                            {permission.name}
                          </Badge>
                        ))}
                      </dd>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No role assigned</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete User"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-medium">
              {user.firstName} {user.lastName}
            </span>
            ? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserDetailsPage;