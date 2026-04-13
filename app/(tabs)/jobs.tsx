// app/(tabs)/jobs.tsx - Mobile Optimized Version
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

interface Job {
  id: number;
  plate_number: string;
  service: number;
  vehicle_type: number;
  price: string;
  status: string;
  created_at: string;
}

export default function JobsScreen() {
  const [activeTab, setActiveTab] = useState('pending');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { role } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load services and vehicles first
      const [servicesRes, vehiclesRes] = await Promise.all([
        api.get('/services/'),
        api.get('/vehicles/'),
      ]);
      setServices(servicesRes.data);
      setVehicles(vehiclesRes.data);
      
      // Then load jobs
      await loadJobs('pending');
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async (status: string) => {
    try {
      const response = await api.get(`/jobs/?status=${status}`);
      setJobs(response.data);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs(activeTab);
    setRefreshing(false);
  };

  const startJob = async (jobId: number) => {
    try {
      await api.post(`/jobs/${jobId}/start/`);
      await loadJobs(activeTab);
      Alert.alert('Success', 'Job started');
    } catch (error) {
      Alert.alert('Error', 'Failed to start job');
    }
  };

  const completeJob = async (jobId: number) => {
    try {
      await api.patch(`/jobs/${jobId}/complete/`);
      await loadJobs(activeTab);
      Alert.alert('Success', 'Job completed');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete job');
    }
  };

  const getServiceName = (id: number) => {
    const service = services.find(s => s.id === id);
    return service?.name || 'Loading...';
  };

  const getVehicleName = (id: number) => {
    const vehicle = vehicles.find(v => v.id === id);
    return vehicle?.name || 'Loading...';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', text: '#92400e' };
      case 'in_progress': return { bg: '#dbeafe', text: '#1e40af' };
      case 'completed': return { bg: '#d1fae5', text: '#065f46' };
      case 'paid': return { bg: '#a7f3d0', text: '#065f46' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Complete';
      case 'paid': return 'Paid ✓';
      default: return status;
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

  const renderJobCard = ({ item }: { item: Job }) => {
    const statusStyle = getStatusStyle(item.status);
    const showAction = item.status === 'pending' || item.status === 'in_progress';
    const actionText = item.status === 'pending' ? 'Start' : 'Complete';
    const actionHandler = item.status === 'pending' ? startJob : completeJob;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.plateNumber}>{item.plate_number}</Text>
          
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
            <Text style={styles.priceLabel}>Amount:</Text>
            <Text style={styles.priceValue}>KES {parseFloat(item.price).toLocaleString()}</Text>
          </View>
        </View>

        {showAction && (
          <TouchableOpacity
            style={[styles.actionButton, item.status === 'pending' ? styles.startButton : styles.completeButton]}
            onPress={() => actionHandler(item.id)}
          >
            <Text style={styles.actionButtonText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'paid', label: 'Paid' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={async () => {
              setActiveTab(tab.key);
              await loadJobs(tab.key);
            }}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {jobs.filter(j => j.status === tab.key).length}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No {activeTab} jobs</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginHorizontal: 4, borderRadius: 8, gap: 6 },
  activeTab: { backgroundColor: '#eff6ff' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  activeTabText: { color: '#3b82f6' },
  badge: { backgroundColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
  listContent: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  timeText: { fontSize: 12, color: '#9ca3af' },
  cardContent: { padding: 16 },
  plateNumber: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  detailsRow: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  detailItem: { flex: 1, backgroundColor: '#f9fafb', padding: 10, borderRadius: 8 },
  detailLabel: { fontSize: 11, fontWeight: '500', color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#374151' },
  priceContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', padding: 10, borderRadius: 8, gap: 6 },
  priceLabel: { fontSize: 13, fontWeight: '500', color: '#065f46' },
  priceValue: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  actionButton: { margin: 12, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  startButton: { backgroundColor: '#3b82f6' },
  completeButton: { backgroundColor: '#10b981' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});