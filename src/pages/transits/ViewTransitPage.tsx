import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { transitService } from '../../services/transitService';
import type { Transit } from '../../types';
import { 
  ArrowLeftIcon, 
  TruckIcon, 
  CalendarIcon, 
  MapPinIcon, 
  UserIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CubeIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const ViewTransitPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [transit, setTransit] = useState<Transit | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!hasPermission("transits.read")) {
      navigate('/transits');
      return;
    }
    if (id) {
      loadTransit();
    }
  }, [id, hasPermission, navigate]);

  const loadTransit = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await transitService.getTransitById(id);
      if (response.success && response.data) {
        setTransit(response.data);
      } else {
        toast.error('Failed to load transit details');
        navigate('/transits');
      }
    } catch (error) {
      console.error('Error loading transit:', error);
      toast.error('Failed to load transit details');
      navigate('/transits');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !transit) return;

    try {
      setDeleteLoading(true);
      const response = await transitService.deleteTransit(id);
      if (response.success) {
        toast.success('Transit deleted successfully');
        navigate('/transits');
      } else {
        toast.error('Failed to delete transit');
      }
    } catch (error) {
      console.error('Error deleting transit:', error);
      toast.error('Failed to delete transit');
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800';
      case 'In Transit':
        return 'bg-yellow-100 text-yellow-800';
      case 'Received':
        return 'bg-green-100 text-green-800';
      case 'Partially Received':
        return 'bg-orange-100 text-orange-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!transit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Transit not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The transit you're looking for doesn't exist or has been removed.
          </p>
          <div className="mt-6">
            <Link
              to="/transits"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
              Back to Transits
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/transits')}
                  className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Transit {transit.transitId}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Created on {formatDate(transit.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transit.status)}`}>
                  {transit.status}
                </span>
                {hasPermission("transits.update") && (
                  <Link
                    to={`/transits/${transit._id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
                    Edit
                  </Link>
                )}
                {hasPermission("transits.delete") && (
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Details */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Product Details
                </h3>
                {transit.productDetails && transit.productDetails.length > 0 ? (
                  <div className="space-y-4">
                    {transit.productDetails.map((product, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Product Name</label>
                            <p className="mt-1 text-sm text-gray-900">{product.productName}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Quantity</label>
                            <p className="mt-1 text-sm text-gray-900">{product.quantity}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Unit</label>
                            <p className="mt-1 text-sm text-gray-900">{product.unit}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No product details available</p>
                )}
              </div>
            </div>

            {/* Route Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Route Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">From Location</label>
                    <div className="mt-1 flex items-center">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.fromLocation === 'string' ? transit.fromLocation : transit.fromLocation?.name}
                        </p>
                        {typeof transit.fromLocation === 'object' && transit.fromLocation?.location && (
                          <p className="text-xs text-gray-500">
                            {transit.fromLocation.location.city}, {transit.fromLocation.location.state}
                            {transit.fromLocation.location.area && ` - ${transit.fromLocation.location.area}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">To Location</label>
                    <div className="mt-1 flex items-center">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.toLocation === 'string' ? transit.toLocation : transit.toLocation?.name}
                        </p>
                        {typeof transit.toLocation === 'object' && transit.toLocation?.location && (
                          <p className="text-xs text-gray-500">
                            {transit.toLocation.location.city}, {transit.toLocation.location.state}
                            {transit.toLocation.location.area && ` - ${transit.toLocation.location.area}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle & Driver Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Vehicle & Driver Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Vehicle Number</label>
                    <div className="mt-1 flex items-center">
                      <TruckIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-900">{transit.vehicleNumber}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Driver</label>
                    <div className="mt-1 flex items-center">
                      <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.driverId === 'string' 
                            ? transit.driverId 
                            : transit.driverId?.firstName && transit.driverId?.lastName
                              ? `${transit.driverId.firstName} ${transit.driverId.lastName}`
                              : 'Not assigned'
                          }
                        </p>
                        {typeof transit.driverId === 'object' && transit.driverId?.email && (
                          <p className="text-xs text-gray-500">{transit.driverId.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                 {/* Attachments */}
            {transit.attachments && transit.attachments.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Attachments
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {transit.attachments
                      .filter(attachment => attachment && attachment.fileName) // Filter out null/undefined attachments
                      .map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {attachment.fileType === 'application/pdf' ? (
                            <DocumentTextIcon className="w-8 h-8 text-red-500" />
                          ) : attachment.fileType?.startsWith('image/') ? (
                            <CubeIcon className="w-8 h-8 text-blue-500" />
                          ) : (
                            <DocumentTextIcon className="w-8 h-8 text-gray-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{attachment.fileName || 'Unknown file'}</p>
                            <p className="text-xs text-gray-500">
                              {attachment.fileSize ? `${(attachment.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                            </p>
                            {attachment.uploadedAt && (
                              <p className="text-xs text-gray-400">
                                Uploaded: {formatDate(attachment.uploadedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {attachment.fileType?.startsWith('image/') && attachment.base64Data && (
                            <button
                              type="button"
                              onClick={() => {
                                // Create a modal or new window to view the image
                                const newWindow = window.open();
                                if (newWindow) {
                                  newWindow.document.write(`
                                    <html>
                                      <head><title>${attachment.fileName || 'Image Preview'}</title></head>
                                      <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f3f4f6;">
                                        <img src="data:${attachment.fileType};base64,${attachment.base64Data}" style="max-width:100%;max-height:100vh;" alt="${attachment.fileName || 'Image'}" />
                                      </body>
                                    </html>
                                  `);
                                }
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Preview"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          )}
                          {attachment.base64Data && attachment.fileType && (
                            <a
                              href={`data:${attachment.fileType};base64,${attachment.base64Data}`}
                              download={attachment.fileName || 'download'}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Download"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Timeline
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dispatch Date</p>
                      <p className="text-xs text-gray-500">{formatDate(transit.dateOfDispatch)}</p>
                    </div>
                  </div>
                  {transit.expectedArrivalDate && (
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Expected Arrival</p>
                        <p className="text-xs text-gray-500">{formatDate(transit.expectedArrivalDate)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Management */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Management
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Assigned Manager</label>
                    <div className="mt-1 flex items-center">
                      <Avatar
                        name={typeof transit.assignedTo === 'string' 
                          ? transit.assignedTo 
                          : transit.assignedTo?.firstName && transit.assignedTo?.lastName
                            ? `${transit.assignedTo.firstName} ${transit.assignedTo.lastName}`
                            : 'Not assigned'
                        }
                        size="sm"
                        className="mr-2"
                      />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.assignedTo === 'string' 
                            ? transit.assignedTo 
                            : transit.assignedTo?.firstName && transit.assignedTo?.lastName
                              ? `${transit.assignedTo.firstName} ${transit.assignedTo.lastName}`
                              : 'Not assigned'
                          }
                        </p>
                        {typeof transit.assignedTo === 'object' && transit.assignedTo?.email && (
                          <p className="text-xs text-gray-500">{transit.assignedTo.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Created By</label>
                    <div className="mt-1 flex items-center">
                      <Avatar
                        name={typeof transit.createdBy === 'string' 
                          ? transit.createdBy 
                          : transit.createdBy?.firstName && transit.createdBy?.lastName
                            ? `${transit.createdBy.firstName} ${transit.createdBy.lastName}`
                            : 'Unknown'
                        }
                        size="sm"
                        className="mr-2"
                      />
                      <div>
                        <p className="text-sm text-gray-900">
                          {typeof transit.createdBy === 'string' 
                            ? transit.createdBy 
                            : transit.createdBy?.firstName && transit.createdBy?.lastName
                              ? `${transit.createdBy.firstName} ${transit.createdBy.lastName}`
                              : 'Unknown'
                          }
                        </p>
                        {typeof transit.createdBy === 'object' && transit.createdBy?.email && (
                          <p className="text-xs text-gray-500">{transit.createdBy.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

         
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Transit"
      >
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <TrashIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Delete Transit
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete transit {transit.transitId}? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={() => setDeleteModalOpen(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ViewTransitPage;