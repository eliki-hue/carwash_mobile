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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../src/services/payment';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jobId: number;
  amount: number;
  plateNumber: string;
  serviceName: string;
  vehicleName: string;
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
}) => {
  const [step, setStep] = useState<'select' | 'manual' | 'stk'>('select');
  const [processing, setProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const resetModal = () => {
    setStep('select');
    setTransactionId('');
    setPhoneNumber('');
    setProcessing(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Cash Payment
  const handleCashPayment = async () => {
    setProcessing(true);
    try {
      await paymentService.processCashPayment(jobId);
      Alert.alert('Success', 'Cash payment recorded successfully!', [
        { text: 'OK', onPress: onSuccess }
      ]);
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  // Manual M-Pesa Payment
  const handleManualMpesa = async () => {
    if (!transactionId.trim()) {
      Alert.alert('Error', 'Please enter M-Pesa transaction ID');
      return;
    }

    setProcessing(true);
    try {
      await paymentService.processManualMpesaPayment(jobId, transactionId);
      Alert.alert('Success', 'M-Pesa payment recorded successfully!', [
        { text: 'OK', onPress: onSuccess }
      ]);
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  // STK Push Payment
  const handleSTKPush = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    // Format phone number
    let formattedNumber = phoneNumber.replace(/\s/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '254' + formattedNumber.substring(1);
    } else if (formattedNumber.startsWith('+')) {
      formattedNumber = formattedNumber.substring(1);
    }

    setProcessing(true);
    try {
      await paymentService.initiateSTKPush(jobId, formattedNumber);
      
      Alert.alert(
        'STK Push Sent!',
        `Check your phone ${phoneNumber} and enter your PIN to complete payment.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Start polling for payment status
              pollPaymentStatus();
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const pollPaymentStatus = async () => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    const interval = setInterval(async () => {
      attempts++;
      try {
        const payment = await paymentService.getPaymentByJob(jobId);
        if (payment && payment.status === 'success') {
          clearInterval(interval);
          Alert.alert('Success', 'Payment received successfully!', [
            { text: 'OK', onPress: onSuccess }
          ]);
          handleClose();
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

  const renderSelectMethod = () => (
    <>
      <View style={styles.jobSummary}>
        <View style={styles.summaryRow}>
          <Ionicons name="car" size={16} color="#6b7280" />
          <Text style={styles.summaryText}>{plateNumber}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="construct" size={16} color="#6b7280" />
          <Text style={styles.summaryText}>{serviceName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="car-sport" size={16} color="#6b7280" />
          <Text style={styles.summaryText}>{vehicleName}</Text>
        </View>
        <View style={[styles.summaryRow, styles.amountRow]}>
          <Ionicons name="cash" size={16} color="#10b981" />
          <Text style={styles.amountText}>KES {amount.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Select Payment Method</Text>
      
      {/* Cash Button */}
      <TouchableOpacity style={styles.methodCard} onPress={handleCashPayment}>
        <View style={[styles.methodIcon, { backgroundColor: '#10b981' }]}>
          <Ionicons name="wallet" size={28} color="#fff" />
        </View>
        <View style={styles.methodInfo}>
          <Text style={styles.methodName}>Cash</Text>
          <Text style={styles.methodDesc}>Pay with cash at counter</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </TouchableOpacity>

      {/* M-Pesa Manual Button */}
      <TouchableOpacity 
        style={styles.methodCard} 
        onPress={() => setStep('manual')}
      >
        <View style={[styles.methodIcon, { backgroundColor: '#3b82f6' }]}>
          <Ionicons name="create-outline" size={28} color="#fff" />
        </View>
        <View style={styles.methodInfo}>
          <Text style={styles.methodName}>M-Pesa Manual</Text>
          <Text style={styles.methodDesc}>Enter transaction ID manually</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </TouchableOpacity>

      {/* M-Pesa STK Push Button */}
      <TouchableOpacity 
        style={styles.methodCard} 
        onPress={() => setStep('stk')}
      >
        <View style={[styles.methodIcon, { backgroundColor: '#8b5cf6' }]}>
          <Ionicons name="phone-portrait" size={28} color="#fff" />
        </View>
        <View style={styles.methodInfo}>
          <Text style={styles.methodName}>M-Pesa STK Push</Text>
          <Text style={styles.methodDesc}>Customer receives prompt on phone</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
      </TouchableOpacity>
    </>
  );

  const renderManualMpesa = () => (
    <>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('select')}>
        <Ionicons name="arrow-back" size={24} color="#3b82f6" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.formCard}>
        <Ionicons name="receipt-outline" size={48} color="#3b82f6" style={styles.formIcon} />
        <Text style={styles.formTitle}>Enter M-Pesa Transaction ID</Text>
        <Text style={styles.formSubtitle}>
          Ask customer for the transaction ID from their M-Pesa message
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons name="document-text-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder="e.g., QWERTY123UI"
            placeholderTextColor="#9ca3af"
            value={transactionId}
            onChangeText={setTransactionId}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, !transactionId && styles.disabledButton]}
          onPress={handleManualMpesa}
          disabled={!transactionId || processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Confirm Payment</Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderSTKPush = () => (
    <>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('select')}>
        <Ionicons name="arrow-back" size={24} color="#3b82f6" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.formCard}>
        <Ionicons name="phone-portrait-outline" size={48} color="#8b5cf6" style={styles.formIcon} />
        <Text style={styles.formTitle}>M-Pesa STK Push</Text>
        <Text style={styles.formSubtitle}>
          Customer will receive a prompt on their phone to complete payment
        </Text>

        <View style={styles.phoneContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+254</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="712345678"
            placeholderTextColor="#9ca3af"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.stkButton, !phoneNumber && styles.disabledButton]}
          onPress={handleSTKPush}
          disabled={!phoneNumber || processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Send STK Push</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.stkHint}>
          Customer must have sufficient balance and enter their PIN to complete payment
        </Text>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Process Payment</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {step === 'select' && renderSelectMethod()}
            {step === 'manual' && renderManualMpesa()}
            {step === 'stk' && renderSTKPush()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  jobSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#4b5563',
  },
  amountRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  methodIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  formCard: {
    alignItems: 'center',
  },
  formIcon: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginBottom: 24,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 24,
    height: 52,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  stkButton: {
    flexDirection: 'row',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  stkHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
  },
});