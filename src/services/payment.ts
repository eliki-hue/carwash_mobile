// src/services/payment.ts
import api from './api';
import { Payment } from '../types';

export const paymentService = {
  // Cash payment
  async processCashPayment(jobId: number): Promise<Payment> {
    const response = await api.post('/payments/', {
      job: jobId,
      method: 'cash',
    });
    return response.data;
  },

  // Manual M-Pesa payment (with transaction ID)
  async processManualMpesaPayment(jobId: number, transactionId: string): Promise<Payment> {
    const response = await api.post('/payments/', {
      job: jobId,
      method: 'mpesa_manual',
      transaction_id: transactionId,
    });
    return response.data;
  },

  // STK Push payment
  async initiateSTKPush(jobId: number, phoneNumber: string): Promise<any> {
    const response = await api.post('/payments/mpesa_stkpush/', {
      job: jobId,
      phone_number: phoneNumber,
    });
    return response.data;
  },

  // Get payment by job
  async getPaymentByJob(jobId: number): Promise<Payment | null> {
    const response = await api.get(`/payments/?job=${jobId}`);
    return response.data.length > 0 ? response.data[0] : null;
  },
};