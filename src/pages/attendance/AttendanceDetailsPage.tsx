import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ArrowLeftIcon, 
  CalendarDaysIcon, 
  ClockIcon, 
  PhotoIcon,
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ComputerDesktopIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import type { Attendance } from '../../types';

const AttendanceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    notes: '',
    checkInTime: '',
    checkOutTime: ''
  });

  // Load attendance details
  useEffect(() => {
    const loadAttendance = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await attendanceService.getAttendanceById(id);
        setAttendance(data);
        setEditForm({
          status: data.status,
          notes: data.notes || '',
          checkInTime: new Date(data.checkInTime).toISOString().slice(0, 16),
          checkOutTime: data.checkOutTime ? new Date(data.checkOutTime).toISOString().slice(0, 16) : ''
        });
      } catch (error: any) {
        console.error('Failed to load attendance:', error);
        toast.error(error.message || 'Failed to load attendance details');
        navigate('/attendance');
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [id, navigate]);

  // Handle save changes
  const handleSave = async () => {
    if (!attendance) return;
    
    try {
      const updateData: any = {
        status: editForm.status,
        notes: editForm.notes
      };
      
      if (editForm.checkInTime) {
        updateData.checkInTime = new Date(editForm.checkInTime).toISOString();
      }
      
      if (editForm.checkOutTime) {
        updateData.checkOutTime = new Date(editForm.checkOutTime).toISOString();
      }
      
      const updatedAttendance = await attendanceService.updateAttendance(attendance._id, updateData);
      setAttendance(updatedAttendance);
      setEditing(false);
      toast.success('Attendance updated successfully');
    } catch (error: any) {
      console.error('Failed to update attendance:', error);
      toast.error(error.message || 'Failed to update attendance');
    }
  };

  // Check permissions
  const canEdit = attendanceService.canManageAttendance(user);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance Not Found</h3>
          <p className="text-gray-500">The requested attendance record could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/attendance')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Attendance Details</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage attendance record details
          </p>
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Information</h3>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {attendance.user.profilePhoto ? (
                  <img
                    className="h-16 w-16 rounded-full object-cover"
                    src={attendance.user.profilePhoto}
                    alt=""
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-gray-600" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  {attendance.user.firstName} {attendance.user.lastName}
                </h4>
                <p className="text-sm text-gray-500">{attendance.user.email}</p>
                {attendance.user.employeeId && (
                  <p className="text-sm text-gray-500">ID: {attendance.user.employeeId}</p>
                )}
              </div>
            </div>
          </div>

          {/* Time Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Time Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  Check In Time
                </label>
                {editing ? (
                  <input
                    type="datetime-local"
                    value={editForm.checkInTime}
                    onChange={(e) => setEditForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {new Date(attendance.checkInTime).toLocaleString()}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  Check Out Time
                </label>
                {editing ? (
                  <input
                    type="datetime-local"
                    value={editForm.checkOutTime}
                    onChange={(e) => setEditForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {attendance.checkOutTime 
                      ? new Date(attendance.checkOutTime).toLocaleString()
                      : 'Not checked out'
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                  Date
                </label>
                <p className="text-sm text-gray-900">
                  {attendanceService.formatDate(attendance.date)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Hours
                </label>
                <p className="text-sm text-gray-900">
                  {attendanceService.formatWorkingHours(attendance.workingHours)}
                </p>
              </div>
            </div>
          </div>

          {/* Status and Notes */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Notes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                {editing ? (
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="half_day">Half Day</option>
                    <option value="absent">Absent</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    attendanceService.formatStatus(attendance.status).className
                  }`}>
                    {attendanceService.formatStatus(attendance.status).label}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                {editing ? (
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any notes about this attendance record..."
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {attendance.notes || 'No notes'}
                  </p>
                )}
              </div>
            </div>

            {editing && (
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Photos */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Photos</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <PhotoIcon className="h-4 w-4 inline mr-1" />
                  Check In Photo
                </label>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={attendance.checkInImage.startsWith('data:') 
                      ? attendance.checkInImage 
                      : `data:image/jpeg;base64,${attendance.checkInImage}`
                    }
                    alt="Check In"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {attendance.checkOutImage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <PhotoIcon className="h-4 w-4 inline mr-1" />
                    Check Out Photo
                  </label>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={attendance.checkOutImage.startsWith('data:') 
                        ? attendance.checkOutImage 
                        : `data:image/jpeg;base64,${attendance.checkOutImage}`
                      }
                      alt="Check Out"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location & System Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            <div className="space-y-4">
              {attendance.godown && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                    Godown
                  </label>
                  <p className="text-sm text-gray-900">{attendance.godown.name}</p>
                  <p className="text-xs text-gray-500">
                    {attendance.godown.location.city}{attendance.godown.location.area ? ` - ${attendance.godown.location.area}` : ''}
                  </p>
                </div>
              )}

              {attendance.checkInLocation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPinIcon className="h-4 w-4 inline mr-1" />
                    Check In Location
                  </label>
                  <p className="text-sm text-gray-900">
                    {attendance.checkInLocation.address || 
                     `${attendance.checkInLocation.latitude.toFixed(6)}, ${attendance.checkInLocation.longitude.toFixed(6)}`
                    }
                  </p>
                </div>
              )}

              {attendance.checkOutLocation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPinIcon className="h-4 w-4 inline mr-1" />
                    Check Out Location
                  </label>
                  <p className="text-sm text-gray-900">
                    {attendance.checkOutLocation.address || 
                     `${attendance.checkOutLocation.latitude.toFixed(6)}, ${attendance.checkOutLocation.longitude.toFixed(6)}`
                    }
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marked By
                </label>
                <p className="text-sm text-gray-900">
                  {attendance.markedBy.firstName} {attendance.markedBy.lastName}
                </p>
                {attendance.isAutoMarked && (
                  <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mt-1">
                    <ComputerDesktopIcon className="h-3 w-3 mr-1" />
                    Auto-marked on login
                  </span>
                )}
              </div>

              {attendance.ipAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Address
                  </label>
                  <p className="text-sm text-gray-900 font-mono">{attendance.ipAddress}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(attendance.createdAt).toLocaleString()}
                </p>
              </div>

              {attendance.updatedAt !== attendance.createdAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(attendance.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailsPage;
