import { of } from 'rxjs';
import {
  AnalyticsPoint,
  DashboardDataService,
  Order,
  SalesBreakdown,
  SalesPoint,
  Summary,
} from '../core/dashboard-data.service';

export const SUMMARY: Summary[] = [
  { key: 'sales', label: 'Sales Products', count: 2341, percent: 80 },
  { key: 'stock', label: 'Stock Products', count: 178, percent: 30 },
  { key: 'return', label: 'Return Products', count: 67, percent: 20 },
];

export const WEEKLY: SalesPoint[] = [
  { label: '10am', value: 30, sales: 1721 },
  { label: '11am', value: 47, sales: 2697 },
  { label: '12am', value: 21, sales: 1205 },
  { label: '01am', value: 42, sales: 2410 },
  { label: '02am', value: 55, sales: 3156 },
  { label: '03am', value: 29, sales: 1664 },
  { label: '04am', value: 64, sales: 3672 },
  { label: '05am', value: 47, sales: 2697 },
  { label: '06am', value: 37, sales: 2123 },
  { label: '07am', value: 54, sales: 3098 },
];

export const MONTHLY: SalesPoint[] = [
  { label: 'W1', value: 45, sales: 2582 },
  { label: 'W2', value: 62, sales: 3557 },
];

export const ORDERS: Order[] = [
  { id: '#9812567', product: 'Air Vapomax', image: 'products/shoe.svg', status: 'Complete', price: 22.78 },
  { id: '#9812411', product: 'Canon EOS 1500D 24.1MP', image: 'products/camera.svg', status: 'Pending', price: 122.8 },
  { id: '#9812556', product: 'MI Backpack Black', image: 'products/backpack.svg', status: 'Canceled', price: 15.99 },
  { id: '#9812619', product: 'iPhone 12 128GB', image: 'products/phone.svg', status: 'Complete', price: 4022 },
  { id: '#9812702', product: 'Sony WH-1000XM4', image: 'products/headphones.svg', status: 'Pending', price: 278.5 },
  { id: '#9812733', product: 'Apple Watch SE', image: 'products/watch.svg', status: 'Complete', price: 249 },
];

export const BREAKDOWN: SalesBreakdown = {
  percent: 70,
  segments: [
    { label: 'Sale', value: 45 },
    { label: 'Distribute', value: 25 },
    { label: 'Return', value: 20 },
  ],
};

export const ANALYTICS: AnalyticsPoint[] = [
  { day: 'Sun', previous: 2750, current: 3500 },
  { day: 'Mon', previous: 2750, current: 2000 },
  { day: 'Tue', previous: 1650, current: 3330 },
];

/** Synchronous stand-in for DashboardDataService; override any method per test. */
export function mockDataService(overrides: Partial<DashboardDataService> = {}): Partial<DashboardDataService> {
  return {
    getSummary: () => of(SUMMARY),
    getSales: (period) => of(period === 'monthly' ? MONTHLY : WEEKLY),
    getSalesBreakdown: () => of(BREAKDOWN),
    getAnalytics: () => of(ANALYTICS),
    getOrders: () => of(ORDERS),
    ...overrides,
  };
}
