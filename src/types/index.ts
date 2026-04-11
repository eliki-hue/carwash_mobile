// src/types/index.ts
export interface User {
  id: number;
  username: string;
  role: 'owner' | 'manager' | 'staff';
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  duration?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: number;
  name: string;
}

export interface ServicePricing {
  id: number;
  service: number;
  service_name: string;
  vehicle_type: number;
  vehicle_name: string;
  price: number;
}

export interface Job {
  id: number;
  plate_number: string;
  service: number;
  service_name?: string;
  vehicle_type: number;
  vehicle_name?: string;
  price?: number;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_staff?: number;
  assigned_staff_name?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface DailyReport {
  total_revenue: number;
  cars_washed: number;
  date: string;
}