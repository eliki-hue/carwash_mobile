// src/types/expense.ts
export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface Expense {
  id: number;
  category: number;
  category_name: string;
  amount: string;
  description?: string;
  expense_date: string;
  created_by: number;
  created_by_username: string;
  created_at: string;
}

export interface ExpenseFormData {
  category: number;
  amount: string;
  description?: string;
  expense_date: string;
}

export interface ProfitReport {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}