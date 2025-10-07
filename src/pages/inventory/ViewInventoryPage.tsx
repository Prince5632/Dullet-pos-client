import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
import type { Inventory } from '../../types';
import { 
  ArrowLeftIcon, 
  CubeIcon, 
  CalendarIcon, 
  ScaleIcon, 
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import OrderActivityTimeline from '../../components/orders/OrderActivityTimeline';
import toast from 'react-hot-toast';

const ViewInventoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Activity timeline state
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesPagination, setActivitiesPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasMore: false,
  });

  const fetchActivities = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!id) return;

      try {
        setActivitiesLoading(true);
        const response = await inventoryService.getInventoryAuditTrail(id, {
          page,
          limit: 5,
        });
        if (append) {
          setActivities((prev) => [...prev, ...response.activities]);
        } else {
          setActivities(response.activities);
        }

        setActivitiesPagination({
          currentPage: response.pagination.currentPage,
          totalPages: response.pagination.totalPages,
          totalCount: response.pagination.totalItems,
          hasMore: response.pagination.hasMore,
        });
      } catch (err: any) {
        console.error("Error fetching activities:", err);
        // Don't show error toast for activities as it's not critical
      } finally {
        setActivitiesLoading(false);
      }
    },
    [id]
  );

  const loadMoreActivities = useCallback(() => {
    if (
      activitiesPagination?.hasMore &&
      !activitiesLoading &&
      activitiesPagination?.currentPage
    ) {
      fetchActivities(activitiesPagination.currentPage + 1, true);
    }
  }, [
    activitiesPagination?.hasMore,
    activitiesPagination?.currentPage,
    activitiesLoading,
    fetchActivities,
  ]);

  useEffect(() => {
    if (!hasPermission("stock.read")) {
      navigate('/inventory');
      return;
    }
    if (id) {
      loadInventory();
      fetchActivities();
    }
  }, [id, hasPermission, navigate, fetchActivities]);

  const loadInventory = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await inventoryService.getInventoryById(id);
      if (response.success && response.data) {
        setInventory(response.data?.inventory || null);
      } else {
        toast.error('Inventory item not found');
        navigate('/inventory');
      }
    } catch (error: any) {
      console.error('Failed to load inventory:', error);
      toast.error(error.message || 'Failed to load inventory details');
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInventory = async () => {
    if (!inventory) return;

    try {
      setDeleteLoading(true);
      await inventoryService.deleteInventory(inventory._id);
      toast.success('Inventory item deleted successfully');
      navigate('/inventory');
    } catch (error: any) {
      console.error('Failed to delete inventory:', error);
      toast.error(error.message || 'Failed to delete inventory item');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getInventoryTypeColor = (type: string) => {
    switch (type) {
      case 'New Stock':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Stock Sold':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Damaged / Return':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-3 sm:px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CubeIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Inventory Details</h1>
                <p className="text-xs text-gray-500">Loading inventory information...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-3 sm:px-4 py-3">
            <div className="flex items-center gap-2">
              <Link to="/inventory" className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                <ArrowLeftIcon className="w-4 h-4 text-gray-600" />
              </Link>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CubeIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Inventory Not Found</h1>
                <p className="text-xs text-gray-500">The requested inventory item could not be found</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/inventory" className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                <ArrowLeftIcon className="w-4 h-4 text-gray-600" />
              </Link>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CubeIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Inventory Details</h1>
                <p className="text-xs text-gray-500">View detailed information about this inventory item</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasPermission("stock.update") && (
                <Link
                  to={`/inventory/edit/${inventory._id}`}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </Link>
              )}
              {hasPermission("stock.delete") && (
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Stock ID and Type Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CubeIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{inventory.stockId}</h2>
                    <p className="text-sm text-gray-500">Stock ID</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getInventoryTypeColor(inventory.inventoryType)}`}>
                  {inventory.inventoryType}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date Information */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5">
                      <CalendarIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">Date of Stock</h3>
                      <p className="text-sm text-gray-600 mt-1">{inventoryService.formatDate(inventory.dateOfStock)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mt-0.5">
                      <ScaleIcon className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">Quantity</h3>
                      <p className="text-sm text-gray-600 mt-1">{inventoryService.formatQuantityWithUnit(inventory.quantity, inventory.unit)}</p>
                    </div>
                  </div>

                  {inventory.godown && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mt-0.5">
                        <BuildingStorefrontIcon className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">Godown</h3>
                        <p className="text-sm text-gray-600 mt-1">{inventory.godown.name}</p>
                        {inventory.godown.location && (
                          <p className="text-xs text-gray-500">
                            {inventory.godown.location.city}, {inventory.godown.location.state}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price and User Information */}
                <div className="space-y-4">
                  {inventory.pricePerKg && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mt-0.5">
                        <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">Price per Kg</h3>
                        <p className="text-sm text-gray-600 mt-1">{inventoryService.formatPrice(inventory.pricePerKg)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Total Value: {inventoryService.formatTotalValue(inventory.quantity, inventory.pricePerKg, inventory.unit)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mt-0.5">
                      <UserIcon className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">Logged By</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {/* <Avatar 
                          name={`${inventory.loggedBy.firstName} ${inventory.loggedBy.lastName}`} 
                          size="sm" 
                        /> */}
                        <div>
                          <p className="text-sm text-gray-600">{inventory.loggedBy.firstName} {inventory.loggedBy.lastName}</p>
                          <p className="text-xs text-gray-500">{inventory.loggedBy.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mt-0.5">
                      <ClockIcon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">Created</h3>
                      <p className="text-sm text-gray-600 mt-1">{inventoryService.formatDateTime(inventory.createdAt)}</p>
                      {inventory.updatedAt && inventory.updatedAt !== inventory.createdAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Updated: {inventoryService.formatDateTime(inventory.updatedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              {inventory.additionalNotes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mt-0.5">
                      <DocumentTextIcon className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">Additional Notes</h3>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{inventory.additionalNotes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <OrderActivityTimeline
                  activities={activities}
                  loading={activitiesLoading}
                  hasMore={activitiesPagination.hasMore}
                  onLoadMore={loadMoreActivities}
                  totalCount={activitiesPagination.totalCount}
                  clampDescriptionLines={3}
                  text="inventory"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteModalOpen(false);
          }
        }}
        title="Delete Inventory Item"
        size="sm"
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <TrashIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Delete Inventory Item</h3>
              <p className="text-xs text-gray-500">This action cannot be undone</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CubeIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{inventory.stockId}</div>
                <div className="text-xs text-gray-500">{inventory.inventoryType}</div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete this inventory item? This action will permanently remove the item from the database and cannot be undone.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteLoading}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteInventory}
              disabled={deleteLoading}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                'Delete Item'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ViewInventoryPage;