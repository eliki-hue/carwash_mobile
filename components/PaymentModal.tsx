// src/components/PaymentModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../services/payment';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jobId: number;
  amount: number;
  plateNumber: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  jobId,
  amount,
  plateNumber,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCashPayment = async () => {
    setProcessing(true);
    try {
      await paymentService.processCashPayment(jobId);
      Alert.alert('Success', 'Cash payment recorded successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleMpesaPayment = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    // Format phone number (remove 0 or +254)
    let formattedNumber = phoneNumber.replace(/\s/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '254' + formattedNumber.substring(1);
    } else if (formattedNumber.startsWith('+')) {
      formattedNumber = formattedNumber.substring(1);
    }

    setProcessing(true);
    try {
      const response = await paymentService.initiateMpesaPayment(jobId, formattedNumber);
      Alert.alert(
        'STK Push Sent',
        `Please check your phone ${phoneNumber} and enter your PIN to complete payment.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Start polling for payment status
              pollPaymentStatus();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const pollPaymentStatus = async () => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    const interval = setInterval(async () => {
      attempts++;
      try {
        const payment = await paymentService.getPaymentByJob(jobId);
        if (payment && payment.status === 'completed') {
          clearInterval(interval);
          Alert.alert('Success', 'Payment received successfully!');
          onSuccess();
          onClose();
        } else if (payment && payment.status === 'failed') {
          clearInterval(interval);
          Alert.alert('Error', 'Payment failed. Please try again.');
          setProcessing(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          Alert.alert('Timeout', 'Payment confirmation taking too long. Please check later.');
          setProcessing(false);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 1000);
  };

  const resetModal = () => {
    setPaymentMethod(null);
    setPhoneNumber('');
    setProcessing(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Process Payment</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.jobInfo}>
            <Text style={styles.jobInfoLabel}>Vehicle:</Text>
            <Text style={styles.jobInfoValue}>{plateNumber}</Text>
            <Text style={styles.jobInfoLabel}>Amount:</Text>
            <Text style={styles.amountValue}>KES {amount.toLocaleString()}</Text>
          </View>

          {!paymentMethod ? (
            <View style={styles.methodSelector}>
              <Text style={styles.methodTitle}>Select Payment Method</Text>
              
              <TouchableOpacity
                style={styles.methodButton}
                onPress={() => setPaymentMethod('cash')}
              >
                <Ionicons name="wallet-outline" size={32} color="#10b981" />
                <View style={styles.methodTextContainer}>
                  <Text style={styles.methodName}>Cash</Text>
                  <Text style={styles.methodDescription}>Pay with cash at counter</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.methodButton}
                onPress={() => setPaymentMethod('mpesa')}
              >
                <Ionicons name="phone-portrait-outline" size={32} color="#3b82f6" />
                <View style={styles.methodTextContainer}>
                  <Text style={styles.methodName}>M-Pesa</Text>
                  <Text style={styles.methodDescription}>Pay using STK Push</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.paymentForm}>
              {paymentMethod === 'mpesa' && (
                <View style={styles.mpesaForm}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.phoneInputContainer}>
                    <Text style={styles.countryCode}>+254</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="712345678"
                      keyboardType="phone-pad"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      editable={!processing}
                    />
                  </View>
                  <Text style={styles.inputHint}>
                    Enter the M-Pesa registered phone number
                  </Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setPaymentMethod(null)}
                  disabled={processing}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    paymentMethod === 'mpesa' && !phoneNumber && styles.disabledButton,
                  ]}
                  onPress={paymentMethod === 'cash' ? handleCashPayment : handleMpesaPayment}
                  disabled={
                    processing ||
                    (paymentMethod === 'mpesa' && !phoneNumber)
                  }
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.confirmButtonText}>
                        {paymentMethod === 'cash' ? 'Confirm Cash Payment' : 'Send STK Push'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  jobInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  jobInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  jobInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginRight: 16,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  methodSelector: {
    padding: 20,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  methodTextContainer: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  paymentForm: {
    padding: 20,
  },
  mpesaForm: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  countryCode: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1f2937',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  inputHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
});