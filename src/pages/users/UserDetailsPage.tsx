import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  KeyIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";
import auditService from "../../services/auditService";
import type { User } from "../../types";
import { formatDateTime, formatDate } from "../../utils";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import UserActivityTimeline from "../../components/users/UserActivityTimeline";
import toast from "react-hot-toast";
import { resolveCapturedImageSrc, resolveProfileImageSrc, resolveDocumentSrc } from "../../utils/image";

const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [activitiesPagination, setActivitiesPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasMore: false,
  });

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      if (!id) {
        navigate("/users");
        return;
      }

      try {
        setLoading(true);
        const userData = await userService.getUserById(id);
        setUser(userData);
      } catch (error) {
        console.error("Failed to load user:", error);
        toast.error("Failed to load user details");
        navigate("/users");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id, navigate]);

  // Handle user actions
  const handleToggleUserStatus = useCallback(async () => {
    if (!user) return;

    try {
      setActionLoading(true);
      if (user.isActive) {
        await userService.deactivateUser(user._id);
        toast.success("User deactivated successfully");
      } else {
        await userService.activateUser(user._id);
        toast.success("User activated successfully");
      }

      // Reload user data
      const updatedUser = await userService.getUserById(user._id);
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  }, [user]);

  const handleDeleteUser = async () => {
    if (!user) return;

    try {
      setActionLoading(true);
      await userService.deleteUser(user._id);
      toast.success("User deleted successfully");
      navigate("/users");
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  // Password reset handler
  const handlePasswordReset = async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      setPasswordLoading(true);
      await userService.changeUserPassword(user._id, newPassword);
      toast.success("Password changed successfully");
      setPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Failed to change password:", error);
      toast.error("Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Load user activity for the specific user
  const loadUserActivity = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!user?._id) return;
      
      try {
        setActivityLoading(true);
        const response = await auditService.getAllSystemActivity(page, 20, {}, user._id);

        // Handle paginated response
        const { activities, pagination } = response.data;

        if (append) {
          setActivityLogs((prev) => [...prev, ...activities]);
        } else {
          setActivityLogs(activities);
        }

        setActivitiesPagination((prev) => ({
          ...prev,
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          totalCount: pagination.totalItems,
          hasMore: pagination.currentPage < pagination.totalPages,
        }));
      } catch (error) {
        console.error("Failed to load user activity:", error);
        toast.error("Failed to load user activity");
      } finally {
        setActivityLoading(false);
      }
    },
    [user?._id]
  );

  // Load more activities for infinite scroll
  const loadMoreActivities = useCallback(() => {
    if (activitiesPagination.hasMore && !activityLoading) {
      loadUserActivity(activitiesPagination.currentPage + 1, true);
    }
  }, [
    activitiesPagination.hasMore,
    activitiesPagination.currentPage,
    activityLoading,
    loadUserActivity,
  ]);

  useEffect(() => {
    if (showActivity && activityLogs.length === 0) {
      loadUserActivity();
    }
  }, [showActivity, loadUserActivity]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Left: Back + User meta */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate("/users")}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors shrink-0"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            <span className="break-words [overflow-wrap:anywhere] text-wrap">
              Back to Users
            </span>
          </button>

          {/* Divider (hide on very small if wrapping gets tight) */}
          <div className="hidden xs:block h-6 border-l border-gray-300" />

          {/* User name + meta */}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words [overflow-wrap:anywhere] text-wrap truncate md:whitespace-normal md:truncate-none">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base break-words [overflow-wrap:anywhere] text-wrap min-w-0">
              {user.position} • {user.department}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible py-1 -mx-1 px-1 min-w-0">
          <button
            onClick={handleToggleUserStatus}
            disabled={actionLoading}
            className={`inline-flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors whitespace-nowrap ${
              user.isActive
                ? "text-orange-700 bg-orange-100 hover:bg-orange-200"
                : "text-green-700 bg-green-100 hover:bg-green-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {user.isActive ? (
              <UserMinusIcon className="h-4 w-4 mr-2 shrink-0" />
            ) : (
              <UserPlusIcon className="h-4 w-4 mr-2 shrink-0" />
            )}
            <span className="break-words [overflow-wrap:anywhere] text-wrap">
              {user.isActive ? "Deactivate" : "Activate"}
            </span>
          </button>

          <button
            onClick={() => setPasswordModalOpen(true)}
            className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <KeyIcon className="h-4 w-4 mr-2 shrink-0" />
            <span className="break-words [overflow-wrap:anywhere] text-wrap">
              Reset Password
            </span>
          </button>

          <Link
            to={`/users/${user._id}/edit`}
            className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <PencilIcon className="h-4 w-4 mr-2 shrink-0" />
            <span className="break-words [overflow-wrap:anywhere] text-wrap">
              Edit User
            </span>
          </Link>

          {currentUser?.role?.name === 'Super Admin' && (
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <TrashIcon className="h-4 w-4 mr-2 shrink-0" />
              <span className="break-words [overflow-wrap:anywhere] text-wrap">
                Delete
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col items-center">
              <Avatar
                src={resolveProfileImageSrc(user.profilePhoto)}
                name={`${user.firstName} ${user.lastName}`}
                size="xl"
                className="mb-4"
              />

              <h2 className="text-xl font-semibold text-gray-900 text-center">
                {user.firstName} {user.lastName}
              </h2>

              <p className="text-gray-600 text-center mb-4">{user.position}</p>

              <Badge variant={user.isActive ? "success" : "error"} size="lg">
                {user.isActive ? "Active" : "Inactive"}
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

                {user.primaryGodown && (
                  <div className="flex items-center text-sm text-gray-600">
                    <BuildingOfficeIcon className="h-4 w-4 mr-3 text-gray-400" />
                    <span>
                      Primary: {user.primaryGodown.name} (
                      {user.primaryGodown.location.city}
                      {user.primaryGodown.location.area
                        ? ` - ${user.primaryGodown.location.area}`
                        : ""}
                      )
                    </span>
                  </div>
                )}

                {user.address && (
                  <div className="flex items-start text-sm text-gray-600">
                    <BuildingOfficeIcon className="h-4 w-4 mr-3 text-gray-400 mt-1" />
                    <span className="space-y-0.5">
                      {user.address.line1 && <div>{user.address.line1}</div>}
                      {user.address.line2 && <div>{user.address.line2}</div>}
                      {(user.address.city || user.address.state || user.address.pincode) && (
                        <div>
                          {[user.address.city, user.address.state]
                            .filter(Boolean)
                            .join(", ")}
                          {user.address.pincode ? ` - ${user.address.pincode}` : ""}
                        </div>
                      )}
                      {user.address.country && <div>{user.address.country}</div>}
                    </span>
                  </div>
                )}

                {(user.aadhaarNumber || user.panNumber) && (
                  <div className="flex flex-col gap-2 text-sm text-gray-600">
                    {user.aadhaarNumber && (
                      <div className="flex items-center">
                        <IdentificationIcon className="h-4 w-4 mr-3 text-gray-400" />
                        <span>Aadhaar: {user.aadhaarNumber}</span>
                      </div>
                    )}
                    {user.panNumber && (
                      <div className="flex items-center">
                        <IdentificationIcon className="h-4 w-4 mr-3 text-gray-400" />
                        <span>PAN: {user.panNumber}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-600">
                  <ShieldCheckIcon className="h-4 w-4 mr-3 text-gray-400" />
                  <span>{user.role?.name || "No Role"}</span>
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
              <h3 className="text-lg font-medium text-gray-900">
                Account Information
              </h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Employee ID
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user.employeeId}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={user.isActive ? "success" : "error"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Account Created
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {formatDate(user.createdAt)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Last Login
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {user.lastLogin ? formatDateTime(user.lastLogin) : "Never"}
                  </dd>
                </div>

                {/* <div>
                  <dt className="text-sm font-medium text-gray-500">Two-Factor Auth</dt>
                  <dd className="mt-1">
                    <Badge variant={user.isTwoFactorEnabled ? 'success' : 'default'}>
                      {user.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Login IP</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.lastLoginIP || 'N/A'}</dd>
                </div> */}
              </dl>
            </div>
          </div>

          {/* Role & Permissions */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Role & Permissions
              </h3>
            </div>
            <div className="p-6">
              {/* Accessible Godowns */}
              {user.accessibleGodowns && user.accessibleGodowns.length > 0 && (
                <div className="mb-6">
                  <dt className="text-sm font-medium text-gray-500 mb-2">
                    Accessible Godowns
                  </dt>
                  <dd className="flex flex-wrap gap-2">
                    {user.accessibleGodowns.map((g) => (
                      <Badge key={g._id} variant="default" size="sm">
                        {g.name}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}

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
                    <dt className="text-sm font-medium text-gray-500">
                      Description
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.role.description}
                    </dd>
                  </div>

                  {user.role.permissions &&
                    user.role.permissions.length > 0 && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 mb-2">
                          Permissions
                        </dt>
                        <dd className="flex flex-wrap gap-2">
                          {user.role.permissions.map((permission) => (
                            <Badge
                              key={permission._id}
                              variant="default"
                              size="sm"
                            >
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

          {user.documents && user.documents.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              </div>
              <div className="p-6 space-y-3">
                {user.documents.map((doc) => (
                  <div
                    key={doc._id || `${doc.type}-${doc.url}`}
                    className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {doc.type === "aadhaar"
                          ? "Aadhaar"
                          : doc.type === "pan"
                          ? "PAN"
                          : doc.label || "Document"}
                      </p>
                      {doc.fileName && (
                        <p className="text-xs text-gray-500">{doc.fileName}</p>
                      )}
                      {doc.uploadedAt && (
                        <p className="text-xs text-gray-400">
                          Uploaded {formatDate(doc.uploadedAt)}
                        </p>
                      )}
                    </div>
                    <a
                      href={resolveDocumentSrc(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Activity */}
          {showActivity && (
            <UserActivityTimeline
              activities={activityLogs}
              loading={activityLoading}
              hasMore={activitiesPagination.hasMore}
              onLoadMore={loadMoreActivities}
              totalCount={activitiesPagination.totalCount}
            />
          )}

          {!showActivity && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    User Activity
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    View activity logs for this user across all modules
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowActivity(!showActivity);
                    if (!showActivity) {
                      setActivityLogs([]);
                      setActivitiesPagination({
                        currentPage: 1,
                        totalPages: 1,
                        totalCount: 0,
                        hasMore: false,
                      });
                    }
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Show System Activity
                </button>
              </div>
            </div>
          )}

          {showActivity && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowActivity(false);
                  setActivityLogs([]);
                  setActivitiesPagination({
                    currentPage: 1,
                    totalPages: 1,
                    totalCount: 0,
                    hasMore: false,
                  });
                }}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ClockIcon className="h-4 w-4 mr-1" />
                Hide System Activity
              </button>
            </div>
          )}
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
            Are you sure you want to delete{" "}
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
              {actionLoading ? "Deleting..." : "Delete User"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setNewPassword("");
          setConfirmPassword("");
        }}
        title="Reset User Password"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Reset the password for{" "}
            <span className="font-medium">
              {user?.firstName} {user?.lastName}
            </span>
            . The user will be notified of the new password.
          </p>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700"
            >
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password"
              minLength={8}
            />
            <p className="mt-1 text-xs text-gray-500">
              Password must be at least 8 characters long
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setPasswordModalOpen(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={passwordLoading || !newPassword || !confirmPassword}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {passwordLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserDetailsPage;
