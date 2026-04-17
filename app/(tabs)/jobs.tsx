// app/(tabs)/jobs.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { paymentService } from '@/src/services/payment';

interface Service {
  id: number;
  name: string;
  price: string;
  duration: number;
}

interface Vehicle {
  id: number;
  name: string;
}

interface Job {
  id: number;
  plate_number: string;
  service: number;
  vehicle_type: number;
  price: string;
  status: 'pending' | 'in_progress' | 'completed' | 'paid';
  assigned_staff?: number | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

type JobStatus = 'pending' | 'in_progress' | 'completed' | 'paid';

export default function JobsScreen() {
  const [activeTab, setActiveTab] = useState<JobStatus>('pending');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showMpesaForm, setShowMpesaForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [processingSTK, setProcessingSTK] = useState(false);
  const [stkStatus, setStkStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [jobCounts, setJobCounts] = useState({
    pending: 0,
    in_progress: 0,
    completed: 0,
    paid: 0
  });
  const [error, setError] = useState<string | null>(null);
  
  const { role, userId, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const isOwner = role === 'owner';
  const isStaff = role === 'staff';

  useEffect(() => {
    if (!authLoading && role) {
      loadInitialData();
    }
  }, [authLoading, role]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && role) {
        refreshAllData();
      }
    }, [activeTab, authLoading, role])
  );

  const refreshAllData = async () => {
    await Promise.all([
      fetchAllJobCounts(),
      fetchJobs(activeTab)
    ]);
  };

  const loadInitialData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      try {
        const [servicesRes, vehiclesRes] = await Promise.all([
          api.get('/services/'),
          api.get('/vehicles/'),
        ]);
        setServices(servicesRes.data);
        setVehicles(vehiclesRes.data);
      } catch (error: any) {
        console.log('Error fetching services/vehicles:', error.response?.status);
      }
      
      await refreshAllData();
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      setError('Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllJobCounts = async () => {
    try {
      const statuses: JobStatus[] = ['pending', 'in_progress', 'completed', 'paid'];
      const counts = { pending: 0, in_progress: 0, completed: 0, paid: 0 };
      
      for (const status of statuses) {
        try {
          const response = await api.get(`/jobs/?status=${status}`);
          const jobsData = Array.isArray(response.data) ? response.data : 
                          (response.data.results || []);
          counts[status] = jobsData.length;
        } catch (error: any) {
          console.error(`Error fetching ${status} count:`, error.response?.status);
        }
      }
      
      setJobCounts(counts);
    } catch (error) {
      console.error('Error fetching job counts:', error);
    }
  };

  const fetchJobs = async (status: string) => {
    try {
      setError(null);
      const response = await api.get(`/jobs/?status=${status}`);
      const jobsData = Array.isArray(response.data) ? response.data : 
                      (response.data.results || []);
      setJobs(jobsData);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      setError('Failed to load jobs. Please try again.');
      setJobs([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await refreshAllData();
    setRefreshing(false);
  };

  const startJob = async (jobId: number) => {
    try {
      await api.post(`/jobs/${jobId}/start/`);
      await refreshAllData();
      Alert.alert('Success', 'Job started successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start job');
    }
  };

  const completeJob = async (jobId: number) => {
    try {
      await api.patch(`/jobs/${jobId}/complete/`);
      await refreshAllData();
      Alert.alert('Success', 'Job completed successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to complete job');
    }
  };

  const processPayment = async (method: string, details?: any) => {
    if (!selectedJob) return;
    
    setSubmitting(true);
    try {
      const paymentData: any = {
        job: selectedJob.id,
        amount: selectedJob.price,
        payment_method: method,
        status: 'completed',
        processed_by: userId,
      };
      
      if (method === 'mpesa_manual' && details?.transaction_id) {
        paymentData.transaction_id = details.transaction_id;
        paymentData.mpesa_receipt = details.transaction_id;
      }
      
      if (method === 'mpesa_stk' && details?.checkout_request_id) {
        paymentData.checkout_request_id = details.checkout_request_id;
        paymentData.mpesa_receipt = details.checkout_request_id;
      }
      
      await api.post('/payments/', paymentData);
      
      await api.patch(`/jobs/${selectedJob.id}/`, {
        status: 'paid'
      });
      
      await refreshAllData();
      
      setShowPaymentModal(false);
      setSelectedJob(null);
      setPaymentMethod('cash');
      setPhoneNumber('');
      setTransactionId('');
      setShowMpesaForm(false);
      setProcessingSTK(false);
      setStkStatus('');
      
      Alert.alert('Success', 'Payment processed successfully');
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMpesaManual = () => {
    if (!transactionId.trim()) {
      Alert.alert('Error', 'Please enter transaction ID');
      return;
    }
    processPayment('mpesa_manual', { transaction_id: transactionId });
  };

  const handleSTKPush = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }
    if (!selectedJob) {
      throw new Error('No job selected');
    }

    let formattedPhone = phoneNumber.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    
    setProcessingSTK(true);
    setStkStatus('Initiating payment...');
    
    try {
      const response = await paymentService.initiateSTKPush(
        selectedJob.id,
        formattedPhone
      );

      
      setStkStatus('Payment request sent. Check your phone...');
      
      const interval = setInterval(async () => {
        try {
          const statusRes = await api.get(`/payments/status/${response.data.checkout_request_id}`);
          if (statusRes.data.status === 'completed') {
            clearInterval(interval);
            setStkStatus('Payment successful!');
            setTimeout(() => {
              processPayment('mpesa_stk', { checkout_request_id: response.data.checkout_request_id });
            }, 1500);
          } else if (statusRes.data.status === 'failed') {
            clearInterval(interval);
            setStkStatus('Payment failed. Please try again.');
            setProcessingSTK(false);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }, 3000);
      
      setTimeout(() => {
        clearInterval(interval);
        if (processingSTK) {
          setStkStatus('Payment timeout. Please try again.');
          setProcessingSTK(false);
        }
      }, 60000);
      
    } catch (error: any) {
      console.error('STK Push error:', error);
      setStkStatus(error.response?.data?.message || 'Payment failed. Please try again.');
      setProcessingSTK(false);
      setTimeout(() => setStkStatus(''), 3000);
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const getServiceName = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || `Service #${serviceId}`;
  };

  const getVehicleName = (vehicleId: number) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.name || `Vehicle #${vehicleId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#fef3c7';
      case 'in_progress':
        return '#dbeafe';
      case 'completed':
        return '#d1fae5';
      case 'paid':
        return '#a7f3d0';
      default:
        return '#f3f4f6';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#92400e';
      case 'in_progress':
        return '#1e40af';
      case 'completed':
        return '#065f46';
      case 'paid':
        return '#065f46';
      default:
        return '#374151';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Complete';
      case 'paid':
        return 'Paid ✓';
      default:
        return status;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleCreateJob = () => {
    router.push('/create-job');
  };

  const openPaymentModal = (job: Job) => {
    setSelectedJob(job);
    setShowPaymentModal(true);
  };

  const PaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowPaymentModal(false);
        setShowMpesaForm(false);
        setPhoneNumber('');
        setTransactionId('');
        setProcessingSTK(false);
        setStkStatus('');
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.paymentModalContent}>
          <View style={styles.paymentModalHeader}>
            <Text style={styles.paymentModalTitle}>Process Payment</Text>
            <TouchableOpacity onPress={() => {
              setShowPaymentModal(false);
              setShowMpesaForm(false);
              setPhoneNumber('');
              setTransactionId('');
              setProcessingSTK(false);
              setStkStatus('');
            }}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedJob && (
              <View style={styles.paymentDetails}>
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Plate Number:</Text>
                  <Text style={styles.paymentDetailValue}>{selectedJob.plate_number}</Text>
                </View>
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Service:</Text>
                  <Text style={styles.paymentDetailValue}>
                    {getServiceName(selectedJob.service)}
                  </Text>
                </View>
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Amount:</Text>
                  <Text style={styles.paymentAmount}>
                    KES {parseFloat(selectedJob.price).toLocaleString()}
                  </Text>
                </View>
                
                {!showMpesaForm && (
                  <View style={styles.paymentMethodSection}>
                    <Text style={styles.paymentMethodLabel}>Select Payment Method</Text>
                    <View style={styles.paymentMethods}>
                      <TouchableOpacity
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === 'cash' && styles.paymentMethodActive
                        ]}
                        onPress={() => setPaymentMethod('cash')}
                      >
                        <Ionicons 
                          name="cash-outline" 
                          size={24} 
                          color={paymentMethod === 'cash' ? '#3b82f6' : '#6b7280'} 
                        />
                        <Text style={[
                          styles.paymentMethodText,
                          paymentMethod === 'cash' && styles.paymentMethodTextActive
                        ]}>Cash</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.paymentMethodOption,
                          paymentMethod === 'mpesa' && styles.paymentMethodActive
                        ]}
                        onPress={() => {
                          setPaymentMethod('mpesa');
                          setShowMpesaForm(true);
                        }}
                      >
                        <Ionicons 
                          name="phone-portrait-outline" 
                          size={24} 
                          color={paymentMethod === 'mpesa' ? '#3b82f6' : '#6b7280'} 
                        />
                        <Text style={[
                          styles.paymentMethodText,
                          paymentMethod === 'mpesa' && styles.paymentMethodTextActive
                        ]}>M-Pesa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {showMpesaForm && (
                  <View style={styles.mpesaSection}>
                    <View style={styles.mpesaOptions}>
                      <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                          setShowMpesaForm(false);
                          setPaymentMethod('cash');
                          setPhoneNumber('');
                          setTransactionId('');
                          setStkStatus('');
                        }}
                      >
                        <Ionicons name="arrow-back" size={20} color="#3b82f6" />
                        <Text style={styles.backButtonText}>Back to payment methods</Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.mpesaTitle}>M-Pesa Payment</Text>
                      
                      <View style={styles.mpesaOptionCard}>
                        <Text style={styles.optionTitle}>STK Push (Prompt on Phone)</Text>
                        <Text style={styles.optionDescription}>
                          Customer will receive a prompt on their phone to enter PIN
                        </Text>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Phone Number</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="0712345678"
                            placeholderTextColor="#9ca3af"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            editable={!processingSTK}
                          />
                          <Text style={styles.inputHint}>
                            Enter the customer's M-Pesa registered phone number
                          </Text>
                        </View>
                        
                        {stkStatus ? (
                          <View style={styles.stkStatusContainer}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text style={styles.stkStatusText}>{stkStatus}</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.stkButton}
                            onPress={handleSTKPush}
                            disabled={!phoneNumber.trim() || processingSTK}
                          >
                            <Text style={styles.stkButtonText}>Send Payment Request</Text>
                            <Ionicons name="send-outline" size={18} color="#fff" />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                      </View>
                      
                      <View style={styles.mpesaOptionCard}>
                        <Text style={styles.optionTitle}>Manual Entry</Text>
                        <Text style={styles.optionDescription}>
                          Enter M-Pesa transaction ID after customer completes payment
                        </Text>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Transaction ID / M-Pesa Receipt</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="e.g., QWER12TY"
                            placeholderTextColor="#9ca3af"
                            value={transactionId}
                            onChangeText={setTransactionId}
                            autoCapitalize="characters"
                          />
                          <Text style={styles.inputHint}>
                            Enter the transaction ID from the M-Pesa message
                          </Text>
                        </View>
                        
                        <TouchableOpacity
                          style={styles.manualButton}
                          onPress={handleMpesaManual}
                          disabled={!transactionId.trim() || submitting}
                        >
                          {submitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Text style={styles.manualButtonText}>Verify & Complete Payment</Text>
                              <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
            
            {!showMpesaForm && paymentMethod === 'cash' && (
              <TouchableOpacity
                style={styles.processPaymentButton}
                onPress={() => processPayment('cash')}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.processPaymentButtonText}>Complete Cash Payment</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const LogoutModal = () => (
    <Modal
      visible={showLogoutModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowLogoutModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.logoutModalContent}>
          <View style={styles.logoutIconContainer}>
            <Ionicons name="log-out-outline" size={48} color="#ef4444" />
          </View>
          <Text style={styles.logoutTitle}>Logout</Text>
          <Text style={styles.logoutMessage}>Are you sure you want to logout?</Text>
          <View style={styles.logoutButtons}>
            <TouchableOpacity 
              style={[styles.logoutButton, styles.cancelButton]}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.logoutButton, styles.confirmButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.confirmButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderJobCard = ({ item }: { item: Job }) => {
    const showActionButton = item.status !== 'completed' && item.status !== 'paid';
    const buttonText = item.status === 'pending' ? 'Start Job' : 'Complete Job';
    const buttonAction = item.status === 'pending' ? startJob : completeJob;
    const isAssignedToMe = isStaff && item.assigned_staff === userId;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={[styles.statusText, { color: getStatusTextColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.plateContainer}>
            <Ionicons name="car-outline" size={22} color="#3b82f6" />
            <Text style={styles.plateNumber}>{item.plate_number}</Text>
            {isAssignedToMe && (
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedText}>Assigned to you</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>{getServiceName(item.service)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>{getVehicleName(item.vehicle_type)}</Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Ionicons name="cash-outline" size={18} color="#059669" />
            <Text style={styles.priceLabel}>Amount:</Text>
            <Text style={styles.priceValue}>
              KES {parseFloat(item.price).toLocaleString()}
            </Text>
          </View>
        </View>

        {showActionButton && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.status === 'pending' ? styles.startButton : styles.completeButton
            ]}
            onPress={() => buttonAction(item.id)}
          >
            <Text style={styles.actionButtonText}>{buttonText}</Text>
            <Ionicons 
              name={item.status === 'pending' ? 'play-circle' : 'checkmark-circle'} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        )}

        {item.status === 'completed' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.paymentButton]}
            onPress={() => openPaymentModal(item)}
          >
            <Text style={styles.actionButtonText}>Process Payment</Text>
            <Ionicons name="cash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {item.status === 'paid' && (
          <View style={[styles.actionButton, styles.paidButton]}>
            <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Payment Received</Text>
          </View>
        )}
      </View>
    );
  };

  const tabs = [
    { key: 'pending', label: 'Pending', icon: 'time-outline' },
    { key: 'in_progress', label: 'In Progress', icon: 'play-circle-outline' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
    { key: 'paid', label: 'Paid', icon: 'cash-outline' },
  ];

  const handleTabChange = async (tabKey: JobStatus) => {
    setActiveTab(tabKey);
    await fetchJobs(tabKey);
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <Text style={styles.title}>Jobs</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleCreateJob}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={32} color="#3b82f6" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={26} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleTabChange(tab.key as JobStatus)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.key ? '#3b82f6' : '#6b7280'} 
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {jobCounts[tab.key as JobStatus]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderJobCard}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title={`No ${activeTab.replace('_', ' ')} jobs`}
            message="No jobs found. Pull down to refresh or create a new job."
          />
        }
      />
      
      <LogoutModal />
      <PaymentModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 4,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  tabBadge: {
    marginLeft: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardContent: {
    padding: 16,
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  assignedBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  assignedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e40af',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#065f46',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    margin: 12,
    borderRadius: 8,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#3b82f6',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  paymentButton: {
    backgroundColor: '#f59e0b',
  },
  paidButton: {
    backgroundColor: '#10b981',
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  logoutIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  logoutMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  logoutButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  paymentModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  paymentDetails: {
    padding: 20,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  paymentMethodSection: {
    marginTop: 20,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 8,
  },
  paymentMethodActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  paymentMethodTextActive: {
    color: '#3b82f6',
  },
  processPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    gap: 8,
  },
  processPaymentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mpesaSection: {
    marginTop: 16,
  },
  mpesaOptions: {
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  mpesaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  mpesaOptionCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  inputHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  stkButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  stkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  stkStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginTop: 8,
  },
  stkStatusText: {
    fontSize: 13,
    color: '#3b82f6',
  },
  manualButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
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
});