import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  PhotoIcon,
  UserIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { userService } from '../../services/userService';
import { godownService } from '../../services/godownService';
import CameraCapture from '../../components/common/CameraCapture';
import type { Attendance, User, Godown, AttendanceListParams } from '../../types';
import { resolveImageSrc } from '../../utils/image';
const AttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraAction, setCameraAction] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [todaysAttendance, setTodaysAttendance] = useState<Attendance | null>(null);
  const [summary, setSummary] = useState<{ totalAttendance: number; presentDays: number } | undefined>();
  const [statusEdits, setStatusEdits] = useState<Record<string, Attendance['status']>>({});
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<AttendanceListParams>({
    page: 1,
    limit: 10,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNext: false,
    hasPrev: false
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [usersData, godownsData] = await Promise.all([
          userService.getUsers({ limit: 100 }),
          godownService.getGodowns()
        ]);
        
        setUsers(usersData.data.users);
        setGodowns(godownsData.data.godowns);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Load attendance data
  const loadAttendance = useCallback(async () => {
    if (!attendanceService.canViewAttendance(user)) {
      return;
    }

    try {
      setLoading(true);
      const response = await attendanceService.getAttendance(filters);
      setAttendance(response.data?.attendance || []);
      setSummary(response.data?.summary);
      setPagination(response.data?.pagination || {
        currentPage: filters.page ?? 1,
        totalPages: 1,
        totalRecords: response.data?.attendance?.length || 0,
        hasNext: false,
        hasPrev: false,
      });
      const initialStatuses: Record<string, Attendance['status']> = {};
      (response.data?.attendance || []).forEach((record) => {
        initialStatuses[record._id] = record.status;
      });
      setStatusEdits(initialStatuses);
    } catch (error: any) {
      console.error('Failed to load attendance:', error);
      toast.error(error.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  // Load today's attendance for current user
  const loadTodaysAttendance = useCallback(async () => {
    try {
      const todaysData = await attendanceService.getTodaysAttendance();
      setTodaysAttendance(todaysData);
    } catch (error) {
      console.error('Failed to load today\'s attendance:', error);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
    loadTodaysAttendance();
  }, [loadAttendance, loadTodaysAttendance]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AttendanceListParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }));
  };

  const handleStatusSelect = (attendanceId: string, newStatus: Attendance['status']) => {
    setStatusEdits((prev) => ({
      ...prev,
      [attendanceId]: newStatus,
    }));
  };

  const handleStatusUpdate = async (record: Attendance) => {
    const newStatus = statusEdits[record._id] ?? record.status;
    if (newStatus === record.status) return;

    try {
      setUpdatingStatusId(record._id);
      await attendanceService.updateAttendance(record._id, { status: newStatus });
      toast.success(`Attendance marked as ${newStatus}`);
      setAttendance((prev) =>
        prev.map((item) =>
          item._id === record._id ? { ...item, status: newStatus } : item
        )
      );
      setStatusEdits((prev) => ({
        ...prev,
        [record._id]: newStatus,
      }));
    } catch (error: any) {
      console.error('Failed to update attendance status:', error);
      toast.error(error.message || 'Failed to update attendance status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const statusOptions: Attendance['status'][] = ['present', 'late', 'half_day', 'absent'];

  // Handle mark attendance
  const handleMarkAttendance = async (_imageData: string, imageFile: File) => {
    try {
      let location;
      try {
        location = await attendanceService.getCurrentLocation();
      } catch (locationError) {
        console.warn('Could not get location:', locationError);
      }

      if (cameraAction === 'checkin') {
        await attendanceService.markAttendance({
          checkInImage: imageFile,
          location,
          notes: ''
        });
        toast.success('Check-in marked successfully!');
      } else {
        await attendanceService.markCheckOut({
          checkOutImage: imageFile,
          location
        });
        toast.success('Check-out marked successfully!');
      }

      loadAttendance();
      loadTodaysAttendance();
    } catch (error: any) {
      console.error('Failed to mark attendance:', error);
      toast.error(error.message || 'Failed to mark attendance');
    }
  };

  // Handle image view
  const handleViewImage = (imageData: string) => {
    setSelectedImage(imageData);
    setShowImageModal(true);
  };

  // Check permissions
  const canMarkAttendance = attendanceService.canMarkAttendance(user);
  const canManageAttendance = attendanceService.canManageAttendance(user);
  const canUpdateStatus = canManageAttendance || attendanceService.canMarkAttendance(user);

  if (!attendanceService.canViewAttendance(user)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view attendance records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage employee attendance records
          </p>
        </div>
        
        {canMarkAttendance && (
          <div className="mt-4 sm:mt-0 flex gap-2">
            {!todaysAttendance && (
              <button
                onClick={() => {
                  setCameraAction('checkin');
                  setShowCamera(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Check In
              </button>
            )}
            
            {todaysAttendance && !todaysAttendance.checkOutTime && (
              <button
                onClick={() => {
                  setCameraAction('checkout');
                  setShowCamera(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <ClockIcon className="h-4 w-4 mr-2" />
                Check Out
              </button>
            )}
          </div>
        )}
      </div>

      {/* Today's Status Card */}
      {todaysAttendance && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Attendance</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Check In</p>
                <p className="font-medium">{attendanceService.formatTime(todaysAttendance.checkInTime)}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Check Out</p>
                <p className="font-medium">
                  {todaysAttendance.checkOutTime 
                    ? attendanceService.formatTime(todaysAttendance.checkOutTime)
                    : 'Not checked out'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <CalendarDaysIcon className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Working Hours</p>
                <p className="font-medium">{attendanceService.formatWorkingHours(todaysAttendance.workingHours)}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="mr-2">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  attendanceService.formatStatus(todaysAttendance.status).className
                }`}>
                  {attendanceService.formatStatus(todaysAttendance.status).label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.totalAttendance}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Present Days</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.presentDays}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {canManageAttendance && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Employees</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Godown</label>
            <select
              value={filters.godownId || ''}
              onChange={(e) => handleFilterChange('godownId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Godowns</option>
              {godowns.map(godown => (
                <option key={godown._id} value={godown._id}>
                  {godown.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search employees..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Working Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Godown
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading attendance records...</p>
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
                    <p className="text-gray-500">No attendance records found for the selected filters.</p>
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {record.user.profilePhoto ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={resolveImageSrc(record.user.profilePhoto)}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.user.firstName} {record.user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{record.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendanceService.formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {attendanceService.formatTime(record.checkInTime)}
                        </div>
                        <button
                          onClick={() => handleViewImage(record.checkInImage)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          title="View check-in photo"
                        >
                          <PhotoIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.checkOutTime ? (
                        <div className="flex items-center">
                          <div className="text-sm text-gray-900">
                            {attendanceService.formatTime(record.checkOutTime)}
                          </div>
                          {record.checkOutImage && (
                            <button
                              onClick={() => handleViewImage(record.checkOutImage!)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                              title="View check-out photo"
                            >
                              <PhotoIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendanceService.formatWorkingHours(record.workingHours)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canUpdateStatus ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={statusEdits[record._id] ?? record.status}
                            onChange={(e) => handleStatusSelect(record._id, e.target.value as Attendance['status'])}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {statusOptions.map((option) => (
                              <option key={option} value={option}>
                                {attendanceService.formatStatus(option).label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleStatusUpdate(record)}
                            disabled={
                              (statusEdits[record._id] ?? record.status) === record.status ||
                              updatingStatusId === record._id
                            }
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                          >
                            Update
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          attendanceService.formatStatus(record.status).className
                        }`}>
                          {attendanceService.formatStatus(record.status).label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.godown ? (
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {record.godown.name}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/attendance/${record._id}`)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords} total records)
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 border border-gray-300 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 border border-gray-300 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleMarkAttendance}
        title={cameraAction === 'checkin' ? 'Check In Photo' : 'Check Out Photo'}
        instructions={`Take a clear photo for ${cameraAction === 'checkin' ? 'check-in' : 'check-out'} verification`}
      />

      {/* Image View Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="max-w-4xl max-h-full p-4">
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-medium">Attendance Photo</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ×
                </button>
              </div>
              <div className="p-4">
                <img
                  src={selectedImage.startsWith('data:') ? selectedImage : `data:image/jpeg;base64,${selectedImage}`}
                  alt="Attendance"
                  className="max-w-full max-h-96 mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
