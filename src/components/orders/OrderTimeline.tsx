import React, { useMemo } from 'react';
import { CalendarIcon, CheckCircleIcon, TruckIcon } from '@heroicons/react/24/outline';
import type { Order } from '../../types';
import { orderService } from '../../services/orderService';

interface OrderTimelineProps {
  order: Order;
}

interface TimelineEvent {
  key: string;
  label: string;
  date: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: 'blue' | 'green' | 'indigo';
}

const colorClasses: Record<TimelineEvent['color'], { dot: string; icon: string }> = {
  blue: { dot: 'bg-blue-500', icon: 'text-blue-600' },
  green: { dot: 'bg-green-500', icon: 'text-green-600' },
  indigo: { dot: 'bg-indigo-500', icon: 'text-indigo-600' },
};

const OrderTimeline: React.FC<OrderTimelineProps> = ({ order }) => {
  const events = useMemo<TimelineEvent[]>(() => {
    const evts: TimelineEvent[] = [];
    if (order.orderDate) {
      evts.push({ key: 'created', label: 'Order Created', date: order.orderDate, icon: CalendarIcon, color: 'blue' });
    }
    if (order.approvedDate) {
      evts.push({ key: 'approved', label: 'Order Approved', date: order.approvedDate, icon: CheckCircleIcon, color: 'green' });
    }
    if (order.dispatchDate) {
      evts.push({ key: 'dispatched', label: 'Order Dispatched', date: order.dispatchDate, icon: TruckIcon, color: 'indigo' });
    }
    if (order.deliveryDate) {
      evts.push({ key: 'delivered', label: 'Order Delivered', date: order.deliveryDate, icon: CheckCircleIcon, color: 'green' });
    }
    return evts;
  }, [order]);

  if (!events.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Order Timeline</h3>
        </div>
        <div className="p-6 text-sm text-gray-500">No timeline events available.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Order Timeline</h3>
      </div>
      <div className="p-4 sm:p-6">
        <ol className="relative border-l border-gray-200 pl-4 sm:pl-6">
          {events.map((evt, idx) => {
            const Icon = evt.icon;
            const isLast = idx === events.length - 1;
            const colors = colorClasses[evt.color];
            return (
              <li key={evt.key} className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                <span className={`absolute -left-1.5 sm:-left-2 h-3 w-3 rounded-full ${colors.dot}`} />
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${colors.icon} flex-shrink-0`} />
                    <span className="text-sm sm:text-base font-medium text-gray-900 truncate">{evt.label}</span>
                  </div>
                  <time className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                    {orderService.formatDate(evt.date)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default OrderTimeline;
