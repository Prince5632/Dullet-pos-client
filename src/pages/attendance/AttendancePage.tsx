import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  CalendarDaysIcon, 
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  EyeIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { userService } from '../../services/userService';
import { godownService } from '../../services/godownService';
import CameraCapture from '../../components/common/CameraCapture';
import Modal from '../../components/ui/Modal';
import type { Attendance, User, Godown, AttendanceListParams } from '../../types';
import { resolveCapturedImageSrc } from '../../utils/image';
import { PERSIST_NS, persistenceService, clearOtherNamespaces } from '../../services/persistenceService';

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
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string }>({ src: '', title: '' });
  const [showImageModal, setShowImageModal] = useState(false);
  const [todaysAttendance, setTodaysAttendance] = useState<Attendance | null>(null);
  const [summary, setSummary] = useState<{ totalAttendance: number; presentDays: number } | undefined>();
  const [statusEdits, setStatusEdits] = useState<Record<string, Attendance['status']>>({});
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dateRangeError, setDateRangeError] = useState("");

  // Persisted Filters
  const persistedFilters = persistenceService.getNS<AttendanceListParams>(
    PERSIST_NS.ATTENDANCE,
    'filters',
    { page: 1, limit: 10, sortBy: 'date', sortOrder: 'desc' }
  );
  const [filters, setFilters] = useState<AttendanceListParams>(persistedFilters);
  const isFirstRender = useRef(true);

  // Persist filters on change
  useEffect(() => {
    persistenceService.setNS(PERSIST_NS.ATTENDANCE, 'filters', filters);
  }, [filters]);

  // After mount, allow filter changes to reset page
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNext: false,
    hasPrev: false
  });



  // Clear other namespaces and load initial data
  useEffect(() => {
    // Clear states from other pages on visiting Attendance
    clearOtherNamespaces(PERSIST_NS.ATTENDANCE);
  }, []);
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [usersData, godownsData] = await Promise.all([
          userService.getUsers({ limit: 100 }),
          godownService.getGodowns()
        ]);
        
        setUsers(usersData.data?.users || []);
        setGodowns(godownsData.data?.godowns || []);
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

  // Handle sync functionality
  const handleSync = async () => {
    setSyncing(true);
    try {
      await Promise.all([
        loadAttendance(),
        loadTodaysAttendance()
      ]);
    } catch (error) {
      console.error("Failed to sync attendance data:", error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadAttendance();
    loadTodaysAttendance();
  }, [loadAttendance, loadTodaysAttendance]);

  // Handle filter changes with persisted state and first-render guard
  const handleFilterChange = (key: keyof AttendanceListParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? (isFirstRender.current ? (prev.page ?? 1) : 1) : value
    }));
  };

  // Date validation functions
  const validateDateRange = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        setDateRangeError("Start date cannot be after end date");
        return false;
      }
    }
    setDateRangeError("");
    return true;
  };

  const handleStartDateChange = (value: string) => {
    handleFilterChange('startDate', value);
    validateDateRange(value, filters.endDate || '');
  };

  const handleEndDateChange = (value: string) => {
    handleFilterChange('endDate', value);
    validateDateRange(filters.startDate || '', value);
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
  const handleMarkAttendance = async (_imageData: string | null, imageFile: File | null) => {
    setShowCamera(false);
    
    if (!imageFile) {
      toast.error(`Photo is required for ${cameraAction === 'checkin' ? 'check-in' : 'check-out'}`);
      return;
    }
    
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
      toast.error(error.message || `Failed to mark ${cameraAction === 'checkin' ? 'check-in' : 'check-out'}`);
    }
  };

  // Handle image view
  const handleViewImage = (imageData: string, title: string) => {
    setSelectedImage({ src: imageData, title });
    setShowImageModal(true);
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  // Check permissions
  const canMarkAttendance = attendanceService.canMarkAttendance(user);
  const canManageAttendance = attendanceService.canManageAttendance(user);

  if (!attendanceService.canViewAttendance(user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view attendance records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Attendance</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Track & manage records</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {/* Sync Button - Always visible */}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex gap-1 cursor-pointer items-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync Attendance Data"
              >
                <ArrowPathIcon 
                  className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} 
                /> Sync
              </button>

              {canMarkAttendance && (
                <>
                  {!todaysAttendance && (
                    <button
                      onClick={() => {
                        setCameraAction('checkin');
                        setShowCamera(true);
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Check In</span>
                      <span className="sm:hidden">In</span>
                    </button>
                  )}
                  
                  {todaysAttendance && !todaysAttendance.checkOutTime && (
                    <button
                      onClick={() => {
                        setCameraAction('checkout');
                        setShowCamera(true);
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                    >
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Check Out</span>
                      <span className="sm:hidden">Out</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3">
        {/* Today's Status Card - Mobile Optimized */}
        {todaysAttendance && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Today's Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Check In</p>
                  <p className="text-sm font-medium truncate">{attendanceService.formatTime(todaysAttendance.checkInTime)}</p>
                </div>
                {todaysAttendance.checkInImage && (
                  <button
                    onClick={() => handleViewImage(todaysAttendance.checkInImage, 'Today\'s Check In Photo')}
                    className="w-6 h-6 rounded-full overflow-hidden hover:ring-2 hover:ring-green-500 hover:ring-offset-1 transition-all group flex-shrink-0"
                  >
                    <img
                      src={resolveCapturedImageSrc(todaysAttendance.checkInImage)}
                      alt="Check In"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <ExclamationCircleIcon className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Check Out</p>
                  <p className="text-sm font-medium truncate">
                    {todaysAttendance.checkOutTime 
                      ? attendanceService.formatTime(todaysAttendance.checkOutTime)
                      : 'Pending'
                    }
                  </p>
                </div>
                {todaysAttendance.checkOutImage && (
                  <button
                    onClick={() => handleViewImage(todaysAttendance.checkOutImage!, 'Today\'s Check Out Photo')}
                    className="w-6 h-6 rounded-full overflow-hidden hover:ring-2 hover:ring-orange-500 hover:ring-offset-1 transition-all group flex-shrink-0"
                  >
                    <img
                      src={resolveCapturedImageSrc(todaysAttendance.checkOutImage)}
                      alt="Check Out"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Working Hours</p>
                  <p className="text-sm font-medium">{attendanceService.formatWorkingHours(todaysAttendance.workingHours)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    attendanceService.formatStatus(todaysAttendance.status).className
                  }`}>
                    {attendanceService.formatStatus(todaysAttendance.status).label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards - Mobile Grid */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Total Records</div>
              <div className="text-lg font-semibold text-gray-900">{summary.totalAttendance}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
              <div className="text-xs text-gray-500">Present Days</div>
              <div className="text-lg font-semibold text-green-600">{summary.presentDays}</div>
            </div>
          </div>
        )}

        {/* Compact Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-3">
            {/* Search Bar */}
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {filters.search && (
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="absolute right-2.5 top-2.5"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  showFilters ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <FunnelIcon className="h-3.5 w-3.5" />
                Filters
              </button>
              
              {(filters.startDate || filters.endDate || filters.userId || filters.godownId || filters.status) && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    placeholder="Start Date"
                    className={`px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 ${
                      dateRangeError 
                        ? "border-red-300 focus:ring-red-500" 
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    placeholder="End Date"
                    className={`px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 ${
                      dateRangeError 
                        ? "border-red-300 focus:ring-red-500" 
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  
                  {/* Date Range Error Message */}
                  {dateRangeError && (
                    <div className="col-span-2 flex items-center text-red-600 text-xs">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {dateRangeError}
                    </div>
                  )}
                  
                  {canManageAttendance && (
                    <select
                      value={filters.userId || ''}
                      onChange={(e) => handleFilterChange('userId', e.target.value)}
                      className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Employees</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  <select
                    value={filters.godownId || ''}
                    onChange={(e) => handleFilterChange('godownId', e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Godowns</option>
                    {godowns.map(godown => (
                      <option key={godown._id} value={godown._id}>
                        {godown.name}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 sm:col-span-2"
                  >
                    <option value="">All Status</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="half_day">Half Day</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attendance List - Mobile Cards */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Records Found</h3>
              <p className="text-xs text-gray-500">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="block lg:hidden divide-y divide-gray-200">
                {attendance.map((record) => (
                  <div key={record._id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">
                          {record.user.profilePhoto ? (
                            <img
                              className="h-8 w-8 rounded-full object-cover"
                              src={resolveCapturedImageSrc(record.user.profilePhoto)}
                              alt=""
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {record.user.firstName} {record.user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{attendanceService.formatDate(record.date)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/attendance/${record._id}`)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="h-3.5 w-3.5 text-green-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500">Check In</div>
                          <div className="text-xs font-medium">{attendanceService.formatTime(record.checkInTime)}</div>
                        </div>
                        {record.checkInImage && (
                          <button
                            onClick={() => handleViewImage(record.checkInImage, 'Check In Photo')}
                            className="w-5 h-5 rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all group flex-shrink-0"
                          >
                            <img
                              src={resolveCapturedImageSrc(record.checkInImage)}
                              alt="Check In"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="h-3.5 w-3.5 text-orange-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500">Check Out</div>
                          <div className="text-xs font-medium">
                            {record.checkOutTime 
                              ? attendanceService.formatTime(record.checkOutTime)
                              : 'Pending'
                            }
                          </div>
                        </div>
                        {record.checkOutImage && (
                          <button
                            onClick={() => handleViewImage(record.checkOutImage!, 'Check Out Photo')}
                            className="w-5 h-5 rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all group flex-shrink-0"
                          >
                            <img
                              src={resolveCapturedImageSrc(record.checkOutImage)}
                              alt="Check Out"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          attendanceService.formatStatus(record.status).className
                        }`}>
                          {attendanceService.formatStatus(record.status).label}
                        </span>
                        {record.godown && (
                          <div className="flex items-center gap-1">
                            <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500 truncate">{record.godown.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {attendanceService.formatWorkingHours(record.workingHours)}
                      </div>
                    </div>

                    {canManageAttendance && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                        <select
                          value={statusEdits[record._id] ?? record.status}
                          onChange={(e) => handleStatusSelect(record._id, e.target.value as Attendance['status'])}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                            !attendanceService.canUpdateStatusFor(record, user) ||
                            (statusEdits[record._id] ?? record.status) === record.status ||
                            updatingStatusId === record._id
                          }
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                        >
                          {updatingStatusId === record._id ? '...' : 'Update'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Godown</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendance.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {record.user.profilePhoto ? (
                              <img className="h-8 w-8 rounded-full object-cover" src={resolveCapturedImageSrc(record.user.profilePhoto)} alt="" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-gray-600" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-900 truncate">
                                {record.user.firstName} {record.user.lastName}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{record.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                          {attendanceService.formatDate(record.date)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-900">{attendanceService.formatTime(record.checkInTime)}</div>
                            {record.checkInImage && (
                              <button
                                onClick={() => handleViewImage(record.checkInImage, 'Check In Photo')}
                                className="w-6 h-6 rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all group"
                              >
                                <img
                                  src={resolveCapturedImageSrc(record.checkInImage)}
                                  alt="Check In"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {record.checkOutTime ? (
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-900">{attendanceService.formatTime(record.checkOutTime)}</div>
                              {record.checkOutImage && (
                                <button
                                  onClick={() => handleViewImage(record.checkOutImage!, 'Check Out Photo')}
                                  className="w-6 h-6 rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all group"
                                >
                                  <img
                                    src={resolveCapturedImageSrc(record.checkOutImage)}
                                    alt="Check Out"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                          {attendanceService.formatWorkingHours(record.workingHours)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {canManageAttendance ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={statusEdits[record._id] ?? record.status}
                                onChange={(e) => handleStatusSelect(record._id, e.target.value as Attendance['status'])}
                                className="px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                  !attendanceService.canUpdateStatusFor(record, user) ||
                                  (statusEdits[record._id] ?? record.status) === record.status ||
                                  updatingStatusId === record._id
                                }
                                className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                              >
                                Update
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              attendanceService.formatStatus(record.status).className
                            }`}>
                              {attendanceService.formatStatus(record.status).label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                          {record.godown ? (
                            <div className="flex items-center gap-1">
                              <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-400" />
                              <span className="truncate">{record.godown.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/attendance/${record._id}`)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                            <span className="text-xs">View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Compact Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-2 py-1 border border-gray-300 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="px-2 py-1 border border-gray-300 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleMarkAttendance}
        title={cameraAction === 'checkin' ? 'Check In Photo' : 'Check Out Photo'}
        instructions={`Take a clear photo for ${cameraAction === 'checkin' ? 'check-in' : 'check-out'} verification`}
      />

      {/* Image View Modal - Using improved Modal component */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title={selectedImage.title}
        size="lg"
      >
        <div className="flex justify-center">
          <img
            src={resolveCapturedImageSrc(selectedImage.src)}
            alt={selectedImage.title}
            className="max-w-full max-h-96 rounded-lg shadow-lg"
          />
        </div>
      </Modal>
    </div>
  );
};

export default AttendancePage;
