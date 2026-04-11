// src/services/payment.ts
import api from './api';
import { Payment, MpesaSTKPushRequest } from '../types';

export const paymentService = {
  // Process cash payment
  async processCashPayment(jobId: number): Promise<Payment> {
    const response = await api.post('/payments/', {
      job: jobId,
      method: 'cash',
    });
    return response.data;
  },

  // Initiate M-Pesa STK Push
  async initiateMpesaPayment(jobId: number, phoneNumber: string): Promise<any> {
    const response = await api.post('/payments/mpesa/stkpush/', {
      job: jobId,
      phone_number: phoneNumber,
    });
    return response.data;
  },

  // Check payment status
  async checkPaymentStatus(jobId: number): Promise<Payment> {
    const response = await api.get(`/payments/?job=${jobId}`);
    return response.data[0];
  },

  // Get payment by job
  async getPaymentByJob(jobId: number): Promise<Payment | null> {
    const response = await api.get(`/payments/?job=${jobId}`);
    return response.data.length > 0 ? response.data[0] : null;
  },
};