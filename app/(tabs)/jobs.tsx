// app/(tabs)/jobs.tsx - Add logout button
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';

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
  const [jobCounts, setJobCounts] = useState({
    pending: 0,
    in_progress: 0,
    completed: 0,
    paid: 0
  });
  
  const { role, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [servicesRes, vehiclesRes] = await Promise.all([
        api.get('/services/'),
        api.get('/vehicles/'),
      ]);
      setServices(servicesRes.data);
      setVehicles(vehiclesRes.data);
      await fetchAllJobCounts();
      await fetchJobs('pending');
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllJobCounts(); // 🔥 your existing function
      fetchJobs(activeTab); // Also refresh jobs when coming back
    }, [activeTab])
  );

  const fetchAllJobCounts = async () => {
    try {
      const statuses: JobStatus[] = ['pending', 'in_progress', 'completed', 'paid'];
      const counts = { pending: 0, in_progress: 0, completed: 0, paid: 0 };
      
      await Promise.all(
        statuses.map(async (status) => {
          try {
            const response = await api.get(`/jobs/?status=${status}`);
            const jobsData = Array.isArray(response.data) ? response.data : 
                            (response.data.results || []);
            counts[status] = jobsData.length;
          } catch (error) {
            console.error(`Error fetching ${status} count:`, error);
          }
        })
      );
      
      setJobCounts(counts);
    } catch (error) {
      // console.error('Error fetching job counts:', error);
    }
  };

  const fetchJobs = async (status: string) => {
    try {
      const response = await api.get(`/jobs/?status=${status}`);
      const jobsData = Array.isArray(response.data) ? response.data : 
                      (response.data.results || []);
      setJobs(jobsData);
    } catch (error) {
      // console.error('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to load jobs');
      setJobs([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAllJobCounts(),
      fetchJobs(activeTab)
    ]);
    setRefreshing(false);
  };

  const startJob = async (jobId: number) => {
    try {
      await api.post(`/jobs/${jobId}/start/`);
      await Promise.all([
        fetchAllJobCounts(),
        fetchJobs(activeTab)
      ]);
      Alert.alert('Success', 'Job started successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to start job');
    }
  };

  const completeJob = async (jobId: number) => {
    try {
      await api.patch(`/jobs/${jobId}/complete/`);
      await Promise.all([
        fetchAllJobCounts(),
        fetchJobs(activeTab)
      ]);
      Alert.alert('Success', 'Job completed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete job');
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
      try {
      await api.post('/users/logout/');
    } catch (e) {
      // even if backend fails, we still logout locally
    }

    await AsyncStorage.removeItem('token');
    router.replace('/(auth)/login');
    // try {
    //   await logout();
    //   // Navigate to login screen
    //   router.replace('/login');
    // } catch (error) {
    //   console.error('Logout error:', error);
    //   Alert.alert('Error', 'Failed to logout. Please try again.');
    // }
  };

  const getServiceName = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Loading...';
  };

  const getVehicleName = (vehicleId: number) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.name || 'Loading...';
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
          <Text style={styles.logoutMessage}>
            Are you sure you want to logout? You will need to login again to access your account.
          </Text>
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
          {/* Plate Number */}
          <View style={styles.plateContainer}>
            <Ionicons name="car-outline" size={22} color="#3b82f6" />
            <Text style={styles.plateNumber}>{item.plate_number}</Text>
          </View>

          {/* Service and Vehicle Row */}
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

          {/* Price */}
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
            onPress={() => Alert.alert('Coming Soon', 'Payment processing will be available soon')}
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <Text style={styles.title}>Jobs</Text>
        <View style={styles.headerButtons}>
          {role === 'owner' && (
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleCreateJob}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={32} color="#3b82f6" />
            </TouchableOpacity>
          )}
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
            message="All caught up! New jobs will appear here."
          />
        }
      />
      
      <LogoutModal />
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
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
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
  // Logout Modal Styles
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
});