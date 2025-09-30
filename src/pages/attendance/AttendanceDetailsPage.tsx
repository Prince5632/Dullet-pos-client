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
  PencilIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import type { Attendance } from '../../types';
import Modal from '../../components/ui/Modal';

const AttendanceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string }>({ src: '', title: '' });
  const [showImageModal, setShowImageModal] = useState(false);
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
      setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  const handleViewImage = (imageData: string, title: string) => {
    setSelectedImage({ src: imageData, title });
    setShowImageModal(true);
  };

  const formatImageSrc = (imageData: string) => {
    return imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;
  };

  // Check permissions
  const canEdit = attendanceService.canManageAttendance(user);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Record Not Found</h3>
          <p className="text-gray-500 mb-4">The attendance record could not be found.</p>
          <button
            onClick={() => navigate('/attendance')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Attendance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/attendance')}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Attendance Details</h1>
                <p className="text-xs text-gray-500 hidden sm:block">View and manage record</p>
              </div>
            </div>
            
            {canEdit && (
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Save
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3 sm:py-4">
        {/* Employee Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {attendance.user.profilePhoto ? (
                <img
                  className="h-12 w-12 rounded-full object-cover"
                  src={attendance.user.profilePhoto}
                  alt=""
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {attendance.user.firstName} {attendance.user.lastName}
              </h3>
              <p className="text-xs text-gray-500 truncate">{attendance.user.email}</p>
              {attendance.user.employeeId && (
                <p className="text-xs text-gray-400">ID: {attendance.user.employeeId}</p>
              )}
            </div>
            <div className="flex-shrink-0">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                attendanceService.formatStatus(attendance.status).className
              }`}>
                {attendanceService.formatStatus(attendance.status).label}
              </span>
            </div>
          </div>
        </div>

        {/* Time & Status Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <ClockIcon className="h-4 w-4 mr-1.5" />
            Time & Status
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {/* Check In */}
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-gray-700">Check In</div>
                {attendance.checkInImage && (
                  <button
                    onClick={() => handleViewImage(attendance.checkInImage, 'Check In Photo')}
                    className="w-6 h-6 rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all group"
                  >
                    <img
                      src={formatImageSrc(attendance.checkInImage)}
                      alt="Check In"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </button>
                )}
              </div>
              {editing ? (
                <input
                  type="datetime-local"
                  value={editForm.checkInTime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <div className="text-xs text-gray-900">
                  {new Date(attendance.checkInTime).toLocaleString()}
                </div>
              )}
            </div>

            {/* Check Out */}
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-gray-700">Check Out</div>
                {attendance.checkOutImage && (
                  <button
                    onClick={() => handleViewImage(attendance.checkOutImage!, 'Check Out Photo')}
                    className="w-6 h-6 rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all group"
                  >
                    <img
                      src={formatImageSrc(attendance.checkOutImage)}
                      alt="Check Out"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </button>
                )}
              </div>
              {editing ? (
                <input
                  type="datetime-local"
                  value={editForm.checkOutTime}
                  onChange={(e) => setEditForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <div className="text-xs text-gray-900">
                  {attendance.checkOutTime 
                    ? new Date(attendance.checkOutTime).toLocaleString()
                    : 'Not checked out'
                  }
                </div>
              )}
            </div>

            {/* Date */}
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-700 mb-1">Date</div>
              <div className="text-xs text-gray-900">
                {attendanceService.formatDate(attendance.date)}
              </div>
            </div>

            {/* Working Hours */}
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-700 mb-1">Working Hours</div>
              <div className="text-xs text-gray-900">
                {attendanceService.formatWorkingHours(attendance.workingHours)}
              </div>
            </div>
          </div>

          {/* Status & Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              {editing ? (
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                </select>
              ) : (
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  attendanceService.formatStatus(attendance.status).className
                }`}>
                  {attendanceService.formatStatus(attendance.status).label}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              {editing ? (
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Add notes..."
                />
              ) : (
                <div className="text-xs text-gray-900 bg-gray-50 p-2 rounded">
                  {attendance.notes || 'No notes'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Photos Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <PhotoIcon className="h-4 w-4 mr-1.5" />
            Photos
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Check In Photo */}
            <div className="text-center">
              <div className="text-xs font-medium text-gray-700 mb-2">Check In</div>
              {attendance.checkInImage ? (
                <button
                  onClick={() => handleViewImage(attendance.checkInImage, 'Check In Photo')}
                  className="mx-auto w-16 h-16 rounded-full overflow-hidden hover:ring-4 hover:ring-blue-500 hover:ring-offset-2 transition-all group shadow-md"
                >
                  <img
                    src={formatImageSrc(attendance.checkInImage)}
                    alt="Check In"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </button>
              ) : (
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <PhotoIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* Check Out Photo */}
            <div className="text-center">
              <div className="text-xs font-medium text-gray-700 mb-2">Check Out</div>
              {attendance.checkOutImage ? (
                <button
                  onClick={() => handleViewImage(attendance.checkOutImage!, 'Check Out Photo')}
                  className="mx-auto w-16 h-16 rounded-full overflow-hidden hover:ring-4 hover:ring-blue-500 hover:ring-offset-2 transition-all group shadow-md"
                >
                  <img
                    src={formatImageSrc(attendance.checkOutImage)}
                    alt="Check Out"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </button>
              ) : (
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <PhotoIcon className="h-6 w-6 text-gray-400" />
                  <div className="absolute -bottom-1 text-xs text-gray-500">No photo</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Additional Information</h3>
          
          <div className="space-y-3">
            {attendance.godown && (
              <div className="flex items-start gap-2">
                <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-700">Godown</div>
                  <div className="text-xs text-gray-900">{attendance.godown.name}</div>
                  <div className="text-xs text-gray-500">
                    {attendance.godown.location.city}{attendance.godown.location.area ? ` - ${attendance.godown.location.area}` : ''}
                  </div>
                </div>
              </div>
            )}

            {attendance.checkInLocation && (
              <div className="flex items-start gap-2">
                <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-700">Check In Location</div>
                  <div className="text-xs text-gray-900 break-all">
                    {attendance.checkInLocation.address || 
                     `${attendance.checkInLocation.latitude.toFixed(6)}, ${attendance.checkInLocation.longitude.toFixed(6)}`
                    }
                  </div>
                </div>
              </div>
            )}

            {attendance.checkOutLocation && (
              <div className="flex items-start gap-2">
                <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-700">Check Out Location</div>
                  <div className="text-xs text-gray-900 break-all">
                    {attendance.checkOutLocation.address || 
                     `${attendance.checkOutLocation.latitude.toFixed(6)}, ${attendance.checkOutLocation.longitude.toFixed(6)}`
                    }
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <UserIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-gray-700">Marked By</div>
                <div className="text-xs text-gray-900">
                  {attendance.markedBy.firstName} {attendance.markedBy.lastName}
                </div>
                {attendance.isAutoMarked && (
                  <div className="flex items-center gap-1 mt-1">
                    <ComputerDesktopIcon className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600">Auto-marked on login</span>
                  </div>
                )}
              </div>
            </div>

            {attendance.ipAddress && (
              <div className="flex items-start gap-2">
                <ComputerDesktopIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-700">IP Address</div>
                  <div className="text-xs text-gray-900 font-mono">{attendance.ipAddress}</div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <span className="font-medium">Created:</span><br />
                  {new Date(attendance.createdAt).toLocaleString()}
                </div>
                {attendance.updatedAt !== attendance.createdAt && (
                  <div>
                    <span className="font-medium">Updated:</span><br />
                    {new Date(attendance.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal - Using improved Modal component */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title={selectedImage.title}
        size="lg"
      >
        <div className="flex justify-center">
          <img
            src={formatImageSrc(selectedImage.src)}
            alt={selectedImage.title}
            className="max-w-full max-h-96 rounded-lg shadow-lg"
          />
        </div>
      </Modal>
    </div>
  );
};

export default AttendanceDetailsPage;
