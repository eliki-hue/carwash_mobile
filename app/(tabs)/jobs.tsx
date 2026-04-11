// app/(tabs)/jobs.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { Job } from '../../src/types';

type JobStatus = 'pending' | 'in_progress' | 'completed';

export default function JobsScreen() {
  const [activeTab, setActiveTab] = useState<JobStatus>('pending');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { role } = useAuth();

  useEffect(() => {
    fetchJobs(activeTab);
  }, [activeTab]);

  const fetchJobs = async (status: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/jobs/?status=${status}`);
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const startJob = async (jobId: number) => {
    try {
      await api.post(`/jobs/${jobId}/start/`);
      // Update local state
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, status: 'in_progress' } : job
        )
      );
      Alert.alert('Success', 'Job started successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to start job');
    }
  };

  const completeJob = async (jobId: number) => {
    try {
      await api.patch(`/jobs/${jobId}/complete/`);
      // Update local state
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, status: 'completed' } : job
        )
      );
      Alert.alert('Success', 'Job completed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete job');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs(activeTab);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#fef3c7';
      case 'in_progress':
        return '#dbeafe';
      case 'completed':
        return '#d1fae5';
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
        return 'Completed';
      default:
        return status;
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const tabs = [
    { key: 'pending', label: 'Pending', count: jobs.filter(j => j.status === 'pending').length },
    { key: 'in_progress', label: 'In Progress', count: jobs.filter(j => j.status === 'in_progress').length },
    { key: 'completed', label: 'Completed', count: jobs.filter(j => j.status === 'completed').length },
  ];

  const renderJobCard = ({ item }: { item: Job }) => {
    const showActionButton = item.status !== 'completed';
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
          {/* Plate Number - Prominent */}
          <View style={styles.plateContainer}>
            <Ionicons name="car-outline" size={22} color="#3b82f6" />
            <Text style={styles.plateNumber}>{item.plate_number}</Text>
          </View>

          {/* Service and Vehicle Row */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>{item.service_name || 'Loading...'}</Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>{item.vehicle_name || 'Loading...'}</Text>
            </View>
          </View>

          {/* Price - Highlighted */}
          {item.price && (
            <View style={styles.priceContainer}>
              <Ionicons name="cash-outline" size={18} color="#059669" />
              <Text style={styles.priceLabel}>Amount:</Text>
              <Text style={styles.priceValue}>KES {item.price.toLocaleString()}</Text>
            </View>
          )}

          {/* Assigned Staff */}
          {item.assigned_staff_name && (
            <View style={styles.staffContainer}>
              <Ionicons name="person-circle-outline" size={16} color="#9ca3af" />
              <Text style={styles.staffText}>Assigned: {item.assigned_staff_name}</Text>
            </View>
          )}
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
      </View>
    );
  };

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
        {role === 'owner' && (
          <TouchableOpacity style={styles.createButton}>
            <Ionicons name="add-circle" size={32} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as JobStatus)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
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
  createButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  tabBadge: {
    marginLeft: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeText: {
    fontSize: 12,
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
    marginBottom: 16,
    gap: 8,
  },
  plateNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  detailBox: {
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
    marginTop: 4,
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
  staffContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  staffText: {
    fontSize: 12,
    color: '#9ca3af',
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
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});