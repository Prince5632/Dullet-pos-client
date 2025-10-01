import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import type {
  Attendance,
  AttendanceStats,
  AttendanceListParams,
  MarkAttendanceForm,
  CheckOutForm,
  ApiResponse,
  User
} from '../types';

type AttendanceListPayload = {
  attendance: Attendance[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary?: {
    totalAttendance: number;
    presentDays: number;
  };
};

class AttendanceService {
  // Get all attendance records
  async getAttendance(params: AttendanceListParams = {}): Promise<ApiResponse<AttendanceListPayload>> {
    const response = await apiService.get<AttendanceListPayload>(
      API_CONFIG.ENDPOINTS.ATTENDANCE,
      { params }
    );

    const defaultPagination = {
      currentPage: params.page ?? 1,
      totalPages: 1,
      totalRecords: response.data?.attendance?.length ?? 0,
      hasNext: false,
      hasPrev: false,
    };

    if (!response.data) {
      return {
        ...response,
        data: {
          attendance: [],
          pagination: defaultPagination,
        },
      };
    }

    return {
      ...response,
      data: {
        attendance: response.data.attendance || [],
        pagination: response.data.pagination ?? defaultPagination,
        summary: response.data.summary,
      },
    };
  }

  // Get attendance by ID
  async getAttendanceById(id: string): Promise<Attendance> {
    const response = await apiService.get<Attendance>(
      API_CONFIG.ENDPOINTS.ATTENDANCE_BY_ID(id)
    );
    if (!response.data) {
      throw new Error('Attendance not found');
    }
    return response.data;
  }

  // Get attendance statistics
  async getAttendanceStats(params: { startDate?: string; endDate?: string; godownId?: string } = {}): Promise<AttendanceStats> {
    const response = await apiService.get<AttendanceStats>(
      API_CONFIG.ENDPOINTS.ATTENDANCE_STATS,
      { params }
    );
    if (!response.data) {
      throw new Error('Stats not found');
    }
    return response.data;
  }

  // Get today's attendance for current user
  async getTodaysAttendance(): Promise<Attendance | null> {
    try {
      const response = await apiService.get<Attendance>(
        API_CONFIG.ENDPOINTS.ATTENDANCE_TODAY
      );
      return response.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No attendance for today
      }
      throw error;
    }
  }

  // Get today's attendance for specific user
  async getTodaysAttendanceByUser(userId: string): Promise<Attendance | null> {
    try {
      const response = await apiService.get<Attendance>(
        API_CONFIG.ENDPOINTS.ATTENDANCE_TODAY_BY_USER(userId)
      );
      return response.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No attendance for today
      }
      throw error;
    }
  }

  // Mark attendance (check-in)
  async markAttendance(formData: MarkAttendanceForm): Promise<Attendance> {
    const form = new FormData();
    
    if (formData.userId) {
      form.append('userId', formData.userId);
    }
    
    if (formData.checkInImage) {
      if (formData.checkInImage instanceof File) {
        form.append('checkInImage', formData.checkInImage);
      } else {
        form.append('checkInImage', formData.checkInImage);
      }
    }
    
    if (formData.location) {
      form.append('location', JSON.stringify(formData.location));
    }
    
    if (formData.notes) {
      form.append('notes', formData.notes);
    }
    
    if (formData.isAutoMarked !== undefined) {
      form.append('isAutoMarked', formData.isAutoMarked.toString());
    }

    const response = await apiService.post<Attendance>(
      API_CONFIG.ENDPOINTS.ATTENDANCE_CHECK_IN,
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (!response.data) {
      throw new Error('Failed to mark attendance');
    }
    return response.data;
  }

  // Mark check-out for today
  async markCheckOut(formData: CheckOutForm): Promise<Attendance> {
    const form = new FormData();
    
    if (formData.checkOutImage) {
      if (formData.checkOutImage instanceof File) {
        form.append('checkOutImage', formData.checkOutImage);
      } else {
        form.append('checkOutImage', formData.checkOutImage);
      }
    }
    
    if (formData.location) {
      form.append('location', JSON.stringify(formData.location));
    }

    const response = await apiService.post<Attendance>(
      API_CONFIG.ENDPOINTS.ATTENDANCE_CHECK_OUT,
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (!response.data) {
      throw new Error('Failed to mark checkout');
    }
    return response.data;
  }

  // Mark check-out for specific attendance record
  async markCheckOutById(attendanceId: string, formData: CheckOutForm): Promise<Attendance> {
    const form = new FormData();
    
    if (formData.checkOutImage) {
      if (formData.checkOutImage instanceof File) {
        form.append('checkOutImage', formData.checkOutImage);
      } else {
        form.append('checkOutImage', formData.checkOutImage);
      }
    }
    
    if (formData.location) {
      form.append('location', JSON.stringify(formData.location));
    }

    const response = await apiService.patch<Attendance>(
      API_CONFIG.ENDPOINTS.ATTENDANCE_CHECK_OUT_BY_ID(attendanceId),
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (!response.data) {
      throw new Error('Failed to mark checkout');
    }
    return response.data;
  }

  // Update attendance record
  async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance> {
    const response = await apiService.put<Attendance>(
      API_CONFIG.ENDPOINTS.ATTENDANCE_BY_ID(id),
      data
    );
    if (!response.data) {
      throw new Error('Failed to update attendance');
    }
    return response.data;
  }

  // Delete attendance record
  async deleteAttendance(id: string): Promise<void> {
    await apiService.delete(API_CONFIG.ENDPOINTS.ATTENDANCE_BY_ID(id));
  }

  // Helper method to get current location
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number; address?: string }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Try to get address from coordinates (optional)
            const address = await this.reverseGeocode(latitude, longitude);
            resolve({ latitude, longitude, address });
          } catch {
            // If reverse geocoding fails, still return coordinates
            resolve({ latitude, longitude });
          }
        },
        (error) => {
          reject(new Error(`Location access denied: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Helper method for reverse geocoding (optional)
  private async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    // This is a simple implementation using a free service
    // In production, you might want to use Google Maps API or similar
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.results[0]?.formatted || 'Unknown location';
      }
    } catch {
      // Fallback if geocoding service fails
    }
    
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  // Format attendance status for display
  formatStatus(status: Attendance['status']): { label: string; className: string } {
    const statusMap = {
      present: { label: 'Present', className: 'bg-green-100 text-green-800' },
      late: { label: 'Late', className: 'bg-yellow-100 text-yellow-800' },
      half_day: { label: 'Half Day', className: 'bg-orange-100 text-orange-800' },
      absent: { label: 'Absent', className: 'bg-red-100 text-red-800' }
    };
    
    return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  }

  // Format working hours for display
  formatWorkingHours(hours: number): string {
    if (hours === 0) return '0 hrs';
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (wholeHours === 0) {
      return `${minutes} min`;
    }
    
    if (minutes === 0) {
      return `${wholeHours} hr${wholeHours !== 1 ? 's' : ''}`;
    }
    
    return `${wholeHours}h ${minutes}m`;
  }

  // Format time for display
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Check if user can mark attendance
  canMarkAttendance(user: any): boolean {
    return user?.role?.permissions?.some((permission: any) => 
      permission.name === 'attendance.create'
    ) || false;
  }

  // Check if user can view attendance
  canViewAttendance(user: any): boolean {
    return user?.role?.permissions?.some((permission: any) => 
      permission.name === 'attendance.read'
    ) || false;
  }

  // Check if user can manage attendance
  canManageAttendance(user: any): boolean {
    return user?.role?.permissions?.some((permission: any) => 
      permission.name === 'attendance.manage' || permission.name === 'attendance.update'
    ) || false;
  }

  // Helpers for finer-grained UI permissions (must mirror backend rules)
  isAdminOrSuperAdmin(user: User | any): boolean {
    const name = user?.role?.name || '';
    return name.includes('Super Admin') || name.includes('Admin');
  }

  isManager(user: User | any): boolean {
    const name = user?.role?.name || '';
    return name.includes('Manager');
  }

  private getUserGodownIds(user: User | any): string[] {
    const ids: string[] = [];
    const list = user?.accessibleGodowns || [];
    for (const g of list) {
      const id = (g && (g as any)._id) ? String((g as any)._id) : (typeof g === 'string' ? g : null);
      if (id) ids.push(id);
    }
    const primary = user?.primaryGodown ? ((user.primaryGodown as any)._id ? String((user.primaryGodown as any)._id) : (typeof user.primaryGodown === 'string' ? user.primaryGodown : null)) : null;
    if (primary) ids.push(primary);
    return ids;
  }

  // Whether user can update status for the specific attendance record
  canUpdateStatusFor(record: Attendance, user: User | any): boolean {
    if (!this.canManageAttendance(user)) return false;
    if (this.isAdminOrSuperAdmin(user)) return true;
    if (this.isManager(user)) {
      const recordGodownId = record.godown ? ((record.godown as any)._id ? String((record.godown as any)._id) : (record.godown as any)) : null;
      if (!recordGodownId) return false;
      const managerGodowns = this.getUserGodownIds(user);
      return managerGodowns.includes(String(recordGodownId));
    }
    return false;
  }

  // Whether user can edit check-in/out times
  canEditTimes(user: User | any): boolean {
    return this.isAdminOrSuperAdmin(user);
  }
}

export const attendanceService = new AttendanceService();
