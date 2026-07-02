// src/types/user.ts
export interface User {
  id: number;
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: 'staff' | 'owner';
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface CreateUserRequest {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  role: 'staff' | 'owner';
}

export interface UpdateUserRequest {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  role?: 'staff' | 'owner';
  is_active?: boolean;
}

export interface ResetPasswordRequest {
  password: string;
  confirm_password: string;
}