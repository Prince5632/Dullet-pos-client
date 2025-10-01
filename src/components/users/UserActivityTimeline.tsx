import React from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  ClockIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserPlusIcon,
  UserMinusIcon,
  DocumentTextIcon,
  KeyIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";

interface ActivityItem {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  action: string;
  module: string;
  resourceType: string;
  resourceId: string;
  oldValues?: any;
  newValues?: any;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface UserActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  totalCount?: number;
  clampDescriptionLines?: 0 | 2 | 3 | 4 | 5 | 6;
}

const UserActivityTimeline: React.FC<UserActivityTimelineProps> = React.memo(
  ({
    activities,
    loading = false,
    hasMore = false,
    onLoadMore = () => {},
    totalCount = 0,
    clampDescriptionLines = 0, // 0 = no clamp
  }) => {
    const getActionIcon = (action: string) => {
      switch (action.toLowerCase()) {
        case "create":
          return UserPlusIcon;
        case "update":
          return PencilIcon;
        case "activate":
          return CheckCircleIcon;
        case "deactivate":
          return UserMinusIcon;
        case "delete":
          return XCircleIcon;
        case "password_reset":
          return KeyIcon;
        case "role_change":
          return ShieldCheckIcon;
        case "login":
          return DocumentTextIcon;
        case "logout":
          return DocumentTextIcon;
        default:
          return ClockIcon;
      }
    };

    const getActionColor = (action: string) => {
      switch (action.toLowerCase()) {
        case "create":
          return "text-green-600 bg-green-100";
        case "update":
          return "text-blue-600 bg-blue-100";
        case "activate":
          return "text-emerald-600 bg-emerald-100";
        case "deactivate":
          return "text-orange-600 bg-orange-100";
        case "delete":
          return "text-red-600 bg-red-100";
        case "password_reset":
          return "text-purple-600 bg-purple-100";
        case "role_change":
          return "text-indigo-600 bg-indigo-100";
        case "login":
          return "text-blue-600 bg-blue-100";
        case "logout":
          return "text-gray-600 bg-gray-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const getChangeDescription = (activity: ActivityItem) => {
      if (activity.description) return activity.description;

      if (activity.oldValues && activity.newValues) {
        const changes: string[] = [];
        for (const [key, newValue] of Object.entries(activity.newValues)) {
          const oldValue = activity.oldValues[key];
          if (oldValue !== newValue) {
            // Handle specific user fields with better formatting
            let formattedKey = key;
            let formattedOldValue = oldValue;
            let formattedNewValue = newValue;

            switch (key) {
              case "firstName":
                formattedKey = "First Name";
                break;
              case "lastName":
                formattedKey = "Last Name";
                break;
              case "isActive":
                formattedKey = "Status";
                formattedOldValue = oldValue ? "Active" : "Inactive";
                formattedNewValue = newValue ? "Active" : "Inactive";
                break;
              case "department":
                formattedKey = "Department";
                break;
              case "position":
                formattedKey = "Position";
                break;
              case "role":
                formattedKey = "Role";
                // If role is an object, try to get the name
                if (
                  typeof oldValue === "object" &&
                  oldValue &&
                  "name" in oldValue
                ) {
                  formattedOldValue = (oldValue as { name: string }).name;
                }
                if (
                  typeof newValue === "object" &&
                  newValue &&
                  "name" in newValue
                ) {
                  formattedNewValue = (newValue as { name: string }).name;
                }
                break;
              default:
                // Capitalize first letter
                formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
            }

            // Handle objects/arrays safely
            if (typeof formattedOldValue === "object") {
              formattedOldValue = JSON.stringify(formattedOldValue);
            }
            if (typeof formattedNewValue === "object") {
              formattedNewValue = JSON.stringify(formattedNewValue);
            }

            changes.push(
              `${formattedKey}: ${formattedOldValue} → ${formattedNewValue}`
            );
          }
        }
        return changes.length > 0 ? changes.join(", ") : "Updated user";
      }

      return `${activity.action} performed on user`;
    };

    const descClampClass =
      clampDescriptionLines > 0 ? `line-clamp-${clampDescriptionLines}` : "";

    // if (loading) {
    //   return (
    //     <div className="bg-white rounded-xl shadow-sm border border-gray-200">
    //       <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
    //         <h3 className="text-sm font-semibold text-gray-900 flex items-center">
    //           <ClockIcon className="h-4 w-4 mr-1.5 text-blue-600" />
    //           User Activity
    //         </h3>
    //       </div>
    //       <div className="p-4">
    //         <div className="animate-pulse space-y-4">
    //           {[1, 2, 3].map((i) => (
    //             <div key={i} className="flex items-start gap-3">
    //               <div className="w-8 h-8 bg-gray-200 rounded-full" />
    //               <div className="flex-1 space-y-2 min-w-0">
    //                 <div className="h-4 bg-gray-200 rounded w-3/4" />
    //                 <div className="h-3 bg-gray-200 rounded w-1/2" />
    //               </div>
    //             </div>
    //           ))}
    //         </div>
    //       </div>
    //     </div>
    //   );
    // }

    if (!activities || activities.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <ClockIcon className="h-4 w-4 mr-1.5 text-blue-600" />
              User Activity
            </h3>
          </div>
          <div className="p-4 text-center text-gray-500 text-sm">
            No activities recorded for this user yet.
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-3 sm:px-4 py-2.5 flex gap-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <ClockIcon className="h-4 w-4 mr-1.5 text-blue-600" />
            User Activity{totalCount > 0 ? ` (${totalCount})` : ""}{" "}
          </h3>
            {loading ? <span className="text-[10px] pt-1 text-gray-500">Loading... </span> : ""}

        </div>
        <div className="p-3 sm:p-4" id="user-activity-scrollable-div">
          <InfiniteScroll
            dataLength={activities.length}
            next={onLoadMore}
            hasMore={hasMore}
            loader={
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            }
            endMessage={
              activities.length > 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  No more activities to load
                </div>
              ) : null
            }
            height={400}
            scrollableTarget="user-activity-scrollable-div"
            className="space-y-4 relative"
          >
            {activities.map((activity, index) => {
              const ActionIcon = getActionIcon(activity.action);
              const actionColor = getActionColor(activity.action);
              const hasNext = index < activities.length - 1;

              return (
                <div
                  key={activity._id}
                  className="flex items-start gap-3 relative"
                >
                  {/* Timeline line */}
                  {hasNext && (
                    <div className="absolute left-4 sm:left-[18px] top-8 bottom-[-8px] w-px bg-gray-200 pointer-events-none" />
                  )}

                  {/* Action icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${actionColor}`}
                  >
                    <ActionIcon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar
                              name={
                                (activity.user?.firstName || "") +
                                " " +
                                (activity.user?.lastName || "")
                              }
                              size="xs"
                            />
                            <span className="text-sm font-medium text-gray-900 break-words text-wrap min-w-0">
                              {`${activity.user?.firstName ?? ""} ${
                                activity.user?.lastName ?? ""
                              }`.trim()}
                            </span>
                          </div>
                          <Badge className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 shrink-0">
                            {activity.action}
                          </Badge>
                        </div>

                        {/* Description: wrap normally, break long tokens, optional clamp on small screens */}
                        <p
                          className={[
                            "text-sm text-gray-600 mb-1 break-words [overflow-wrap:anywhere] text-wrap",
                            // Optional: clamp on small screens, expand on md+
                            clampDescriptionLines > 0
                              ? `${descClampClass} md:line-clamp-none`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          title={getChangeDescription(activity)}
                        >
                          {getChangeDescription(activity)}
                        </p>

                        {/* Meta: ensure no overflow, allow wrap and breaks */}
                        <p className="text-xs text-gray-500 break-words [overflow-wrap:anywhere] text-wrap">
                          {formatDate(activity.createdAt)}
                          {activity.ipAddress && (
                            <span className="ml-2">
                              • IP: {activity.ipAddress}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </InfiniteScroll>
        </div>
      </div>
    );
  }
);

export default UserActivityTimeline;
