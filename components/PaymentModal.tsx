// src/components/PaymentModal.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/src/services/api';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jobId: number;
  amount: number;
  plateNumber: string;
  serviceName: string;
  vehicleName: string;
  onCashPayment: (jobId: number) => Promise<void>;
  onManualMpesaPayment: (jobId: number, transactionId: string) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  jobId,
  amount,
  plateNumber,
  serviceName,
  vehicleName,
  onCashPayment,
  onManualMpesaPayment,
}) => {
  const [step, setStep] = useState<'select' | 'manual' | 'stk'>('select');
  const [processing, setProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [stkStatus, setStkStatus] = useState('');
  const [processingSTK, setProcessingSTK] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const resetModal = useCallback(() => {
    setStep('select');
    setProcessing(false);
    setTransactionId('');
    setPhoneNumber('');
    setStkStatus('');
    setProcessingSTK(false);
    setPaymentFailed(false);
    setCanRetry(false);
    setCheckoutRequestId(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  // Cash Payment
  const handleCashPayment = useCallback(async () => {
    setProcessing(true);
    try {
      await onCashPayment(jobId);
      Alert.alert('Success', 'Cash payment recorded successfully!', [
        { text: 'OK', onPress: onSuccess }
      ]);
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  }, [jobId, onCashPayment, onSuccess, handleClose]);

  // Manual M-Pesa Payment
  const handleManualMpesa = useCallback(async () => {
    const trimmedTransactionId = transactionId.trim();
    if (!trimmedTransactionId) {
      Alert.alert('Error', 'Please enter transaction ID');
      return;
    }

    setProcessing(true);
    try {
      await onManualMpesaPayment(jobId, trimmedTransactionId);
      Alert.alert('Success', 'M-Pesa payment recorded successfully!', [
        { text: 'OK', onPress: onSuccess }
      ]);
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  }, [jobId, transactionId, onManualMpesaPayment, onSuccess, handleClose]);

  // Retry STK Push using backend endpoint
  const handleRetrySTK = useCallback(async () => {
    setProcessingSTK(true);
    setStkStatus('Retrying payment request...');
    setPaymentFailed(false);
    
    try {
      const response = await api.post('/payments/retry_stk/', {
        job: jobId,
      });
      
      console.log('Retry STK response:', response.data);
      
      const newCheckoutRequestId = response.data.checkout_request_id;
      setCheckoutRequestId(newCheckoutRequestId);
      setStkStatus('Payment request sent. Waiting for customer to complete payment...');
      
      // Start polling for status
      startPolling(newCheckoutRequestId);
      
    } catch (error: any) {
      console.error('Retry STK error:', error.response?.data || error);
      setStkStatus(error.response?.data?.error || 'Failed to retry payment. Please use manual entry.');
      setProcessingSTK(false);
      setPaymentFailed(true);
    }
  }, [jobId]);

  // Start polling for payment status
  const startPolling = useCallback((checkoutId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts = 120 seconds total
    
    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const statusRes = await api.get(`/payments/status/${checkoutId}/`);
        console.log('Payment status check:', statusRes.data);
        
        if (statusRes.data.status === 'success') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setStkStatus('Payment successful! Updating...');
          onSuccess();
          
          setTimeout(() => {
            Alert.alert('Success', 'Payment received successfully!', [
              { text: 'OK', onPress: () => handleClose() }
            ]);
          }, 1500);
          
        } else if (statusRes.data.status === 'failed' || 
                   statusRes.data.status === 'cancelled' || 
                   statusRes.data.status === 'expired') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setPaymentFailed(true);
          setCanRetry(true);
          setStkStatus(`Payment ${statusRes.data.status}. Customer did not complete the transaction.`);
          setProcessingSTK(false);
          
        } else if (attempts >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setPaymentFailed(true);
          setCanRetry(true);
          setStkStatus('Payment timeout. Customer did not complete the transaction within the time limit.');
          setProcessingSTK(false);
        }
        
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 2000);
  }, [onSuccess, handleClose]);

  // STK Push Payment
  const handleSTKPush = useCallback(async () => {
    let rawPhoneNumber = phoneNumber.replace(/\s/g, '');
    if (!rawPhoneNumber || rawPhoneNumber.length < 9) {
      Alert.alert('Error', 'Please enter a valid phone number (minimum 9 digits)');
      return;
    }

    // Format phone number to 254XXXXXXXXX format
    let formattedNumber = rawPhoneNumber;
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '254' + formattedNumber.substring(1);
    } else if (formattedNumber.startsWith('+')) {
      formattedNumber = formattedNumber.substring(1);
    } else if (formattedNumber.length === 9 && !formattedNumber.startsWith('254')) {
      formattedNumber = '254' + formattedNumber;
    }
    
    if (!formattedNumber.startsWith('254')) {
      formattedNumber = '254' + formattedNumber;
    }

    setProcessingSTK(true);
    setStkStatus('Initiating payment...');
    setPaymentFailed(false);
    setCanRetry(false);

    try {
      // Ensure job is in_progress
      try {
        const jobResponse = await api.get(`/jobs/${jobId}/`);
        if (jobResponse.data.status !== 'in_progress' && jobResponse.data.status !== 'completed') {
          await api.patch(`/jobs/${jobId}/`, {
            status: 'in_progress'
          });
        }
      } catch (err) {
        console.log('Error checking job status:', err);
      }
      
      const response = await api.post('/payments/mpesa_stkpush/', {
        job: jobId,
        phone_number: formattedNumber,
      });
      
      console.log('STK Push response:', response.data);
      
      const newCheckoutRequestId = response.data.checkout_request_id;
      setCheckoutRequestId(newCheckoutRequestId);
      setStkStatus('Payment request sent. Waiting for customer to complete payment...');
      
      // Start polling for status
      startPolling(newCheckoutRequestId);
      
    } catch (error: any) {
      console.error('STK Push error:', error.response?.data || error);
      
      let errorMessage = '';
      if (error.response?.data?.error === "Job already has a payment") {
        errorMessage = 'A payment is already being processed for this job.';
        setCanRetry(true);
      } else if (error.response?.data?.error === "Job must be in progress") {
        errorMessage = 'Job must be in progress to process payment. Please start the job first.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        setCanRetry(true);
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        setCanRetry(true);
      } else {
        errorMessage = 'Failed to send STK Push. Please try manual entry.';
      }
      
      setStkStatus(errorMessage);
      setProcessingSTK(false);
      setPaymentFailed(true);
    }
  }, [jobId, phoneNumber, startPolling]);

  const renderSelectMethod = () => (
    <>
      <View style={styles.summaryCard}>
        <Text style={styles.plate}>{plateNumber}</Text>
        <Text style={styles.meta}>
          {serviceName} • {vehicleName}
        </Text>
        <Text style={styles.amount}>
          KES {(amount ?? 0).toLocaleString()}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.paymentOption}
        onPress={handleCashPayment}
        disabled={processing}
      >
        <Ionicons name="cash-outline" size={24} color="#10b981" />
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Cash</Text>
          <Text style={styles.optionSubtitle}>Receive cash payment</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.paymentOption}
        onPress={() => setStep('manual')}
        disabled={processing}
      >
        <Ionicons name="document-text-outline" size={24} color="#3b82f6" />
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Manual M-Pesa</Text>
          <Text style={styles.optionSubtitle}>Enter transaction code</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.paymentOption}
        onPress={() => setStep('stk')}
        disabled={processing}
      >
        <Ionicons name="phone-portrait-outline" size={24} color="#8b5cf6" />
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>STK Push</Text>
          <Text style={styles.optionSubtitle}>Send prompt to customer phone</Text>
        </View>
      </TouchableOpacity>
    </>
  );

  const renderManualMpesa = () => (
    <>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('select')}
      >
        <Ionicons name="arrow-back" size={20} color="#3b82f6" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Enter Transaction ID</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g QWE123ABC"
        placeholderTextColor="#9ca3af"
        value={transactionId}
        onChangeText={setTransactionId}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        editable={!processing}
      />

      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleManualMpesa}
        disabled={processing}
      >
        {processing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmButtonText}>Confirm Payment</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderSTKPush = () => (
    <>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('select')}
      >
        <Ionicons name="arrow-back" size={20} color="#8b5cf6" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Customer Phone Number</Text>

      <View style={styles.phoneContainer}>
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>+254</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          placeholder="712345678"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          returnKeyType="done"
          value={phoneNumber}
          onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
          editable={!processingSTK}
        />
      </View>

      {stkStatus ? (
        <View style={styles.stkStatusContainer}>
          <ActivityIndicator size="small" color="#8b5cf6" />
          <Text style={styles.stkStatusText}>{stkStatus}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.stkButton}
          onPress={handleSTKPush}
          disabled={!phoneNumber || phoneNumber.length < 9 || processingSTK}
        >
          {processingSTK ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Send STK Push</Text>
          )}
        </TouchableOpacity>
      )}
      
      {/* Show retry button if payment failed and retry is available */}
      {paymentFailed && canRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetrySTK}
        >
          <Ionicons name="refresh-outline" size={20} color="#3b82f6" />
          <Text style={styles.retryButtonText}>Retry STK Push</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>
      
      <TouchableOpacity
        style={styles.manualFallbackButton}
        onPress={() => setStep('manual')}
      >
        <Text style={styles.manualFallbackText}>Enter Transaction ID Manually</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Payment</Text>
            <TouchableOpacity onPress={handleClose} disabled={processing || processingSTK}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {step === 'select' && renderSelectMethod()}
            {step === 'manual' && renderManualMpesa()}
            {step === 'stk' && renderSTKPush()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  plate: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    marginTop: 6,
    color: '#6b7280',
    fontSize: 14,
  },
  amount: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  optionContent: {
    marginLeft: 14,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  optionSubtitle: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 13,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    marginLeft: 6,
    color: '#3b82f6',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  countryCode: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#d1d5db',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stkButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stkStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
  },
  stkStatusText: {
    fontSize: 14,
    color: '#8b5cf6',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  manualFallbackButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  manualFallbackText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
});