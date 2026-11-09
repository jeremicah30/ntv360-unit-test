import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

export interface Summary {
  key: 'sales' | 'stock' | 'return';
  label: string;
  count: number;
  percent: number;
}

export type SalesPeriod = 'weekly' | 'monthly' | 'yearly';

export interface SalesPoint {
  label: string;
  /** Position on the 0–100 Y axis. */
  value: number;
  /** Sales figure shown in the tooltip. */
  sales: number;
}

export type OrderStatus = 'Complete' | 'Pending' | 'Canceled';

export interface Order {
  id: string;
  product: string;
  image: string;
  status: OrderStatus;
  price: number;
}

export interface SalesBreakdown {
  /** Headline percentage shown in the donut centre. */
  percent: number;
  /** Segment shares of the ring, 0–100 each. */
  segments: { label: 'Sale' | 'Distribute' | 'Return'; value: number }[];
}

export interface AnalyticsPoint {
  day: string;
  previous: number;
  current: number;
}

const LATENCY_MS = 400;

const SALES: Record<SalesPeriod, SalesPoint[]> = {
  weekly: toPoints(
    ['10am', '11am', '12am', '01am', '02am', '03am', '04am', '05am', '06am', '07am'],
    [30, 47, 21, 42, 55, 29, 64, 47, 37, 54],
  ),
  monthly: toPoints(['W1', 'W2', 'W3', 'W4'], [45, 62, 38, 71]),
  yearly: toPoints(
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    [40, 35, 52, 48, 60, 58, 72, 66, 55, 63, 70, 80],
  ),
};

function toPoints(labels: string[], values: number[]): SalesPoint[] {
  return labels.map((label, i) => ({ label, value: values[i], sales: Math.round(values[i] * 57.375) }));
}

/** Mock data source. Each method mimics an HTTP call with a short delay. */
@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  getSummary(): Observable<Summary[]> {
    return of<Summary[]>([
      { key: 'sales', label: 'Sales Products', count: 2341, percent: 80 },
      { key: 'stock', label: 'Stock Products', count: 178, percent: 30 },
      { key: 'return', label: 'Return Products', count: 67, percent: 20 },
    ]).pipe(delay(LATENCY_MS));
  }

  getSales(period: SalesPeriod): Observable<SalesPoint[]> {
    return of(SALES[period]).pipe(delay(LATENCY_MS));
  }

  getSalesBreakdown(): Observable<SalesBreakdown> {
    return of<SalesBreakdown>({
      percent: 70,
      segments: [
        { label: 'Sale', value: 45 },
        { label: 'Distribute', value: 25 },
        { label: 'Return', value: 20 },
      ],
    }).pipe(delay(LATENCY_MS));
  }

  getAnalytics(): Observable<AnalyticsPoint[]> {
    return of<AnalyticsPoint[]>([
      { day: 'Sun', previous: 2750, current: 3500 },
      { day: 'Mon', previous: 2750, current: 2000 },
      { day: 'Tue', previous: 1650, current: 3330 },
      { day: 'Wed', previous: 3500, current: 4300 },
      { day: 'Thu', previous: 2750, current: 1400 },
      { day: 'Fri', previous: 2500, current: 1950 },
    ]).pipe(delay(LATENCY_MS));
  }

  getOrders(): Observable<Order[]> {
    return of<Order[]>([
      { id: '#9812567', product: 'Air Vapomax', image: 'products/shoe.svg', status: 'Complete', price: 22.78 },
      { id: '#9812411', product: 'Canon EOS 1500D 24.1MP', image: 'products/camera.svg', status: 'Pending', price: 122.8 },
      { id: '#9812556', product: 'MI Backpack Black', image: 'products/backpack.svg', status: 'Canceled', price: 15.99 },
      { id: '#9812619', product: 'iPhone 12 128GB', image: 'products/phone.svg', status: 'Complete', price: 4022 },
      { id: '#9812702', product: 'Sony WH-1000XM4', image: 'products/headphones.svg', status: 'Pending', price: 278.5 },
      { id: '#9812733', product: 'Apple Watch SE', image: 'products/watch.svg', status: 'Complete', price: 249 },
      { id: '#9812790', product: 'Air Jordan 1 Mid', image: 'products/shoe.svg', status: 'Canceled', price: 115 },
      { id: '#9812815', product: 'Galaxy S23 256GB', image: 'products/phone.svg', status: 'Complete', price: 899.99 },
    ]).pipe(delay(LATENCY_MS));
  }
}
