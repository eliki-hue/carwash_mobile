// src/types/index.ts
export interface User {
  id: number;
  username: string;
  role: 'owner' | 'manager' | 'staff';
}

export interface VehicleType {
  id: number;
  name: string;
}

export interface Service {
  id: number;
  name: string;
  price: string;
  duration: number;
}

export interface ServicePricing {
  id: number;
  service: number;
  service_name?: string;
  vehicle_type: number;
  vehicle_name?: string;
  price: string;
}

export interface Job {
  id: number;
  plate_number: string;
  service: number;
  service_name?: string;
  vehicle_type: number;
  vehicle_name?: string;
  price?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'paid';
  assigned_staff?: number;
  assigned_staff_name?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Payment {
  id: number;
  job: number;
  method: 'cash' | 'mpesa';
  amount: number;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface DailyReport {
  total_revenue: number;
  cars_washed: number;
  date: string;
}

export interface MpesaSTKPushRequest {
  phone_number: string;
  amount: number;
  job_id: number;
}