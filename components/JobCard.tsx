// src/components/JobCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Job } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { PaymentModal } from './PaymentModal';

interface JobCardProps {
  job: Job;
  onStartJob: (jobId: number) => void;
  onCompleteJob: (jobId: number) => void;
  onRefresh?: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({ 
  job, 
  onStartJob, 
  onCompleteJob,
  onRefresh 
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return styles.pending;
      case 'in_progress':
        return styles.inProgress;
      case 'completed':
        return styles.completed;
      case 'paid':
        return styles.paid;
      default:
        return styles.pending;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'paid':
        return 'Paid ✓';
      default:
        return job.status;
    }
  };

  const getStatusTextColor = () => {
    switch (job.status) {
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handlePaymentSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const renderActionButton = () => {
    if (job.status === 'pending') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.startButton]}
          onPress={() => onStartJob(job.id)}
        >
          <Ionicons name="play-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Start Job</Text>
        </TouchableOpacity>
      );
    }
    
    if (job.status === 'in_progress') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => onCompleteJob(job.id)}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Complete Job</Text>
        </TouchableOpacity>
      );
    }
    
    if (job.status === 'completed') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.paymentButton]}
          onPress={() => setShowPaymentModal(true)}
        >
          <Ionicons name="cash-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Process Payment</Text>
        </TouchableOpacity>
      );
    }
    
    if (job.status === 'paid') {
      return (
        <View style={[styles.actionButton, styles.paidButton]}>
          <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Payment Received</Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, getStatusColor()]}>
            <Text style={[styles.statusText, { color: getStatusTextColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatTime(job.created_at)}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.plateContainer}>
            <Ionicons name="car-outline" size={22} color="#3b82f6" />
            <Text style={styles.plateNumber}>{job.plate_number}</Text>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>{job.service_name || 'Loading...'}</Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>{job.vehicle_name || 'Loading...'}</Text>
            </View>
          </View>

          {job.price && (
            <View style={styles.priceContainer}>
              <Ionicons name="cash-outline" size={18} color="#059669" />
              <Text style={styles.priceLabel}>Amount:</Text>
              <Text style={styles.priceValue}>KES {job.price.toLocaleString()}</Text>
            </View>
          )}

          {job.assigned_staff_name && (
            <View style={styles.staffContainer}>
              <Ionicons name="person-circle-outline" size={16} color="#9ca3af" />
              <Text style={styles.staffText}>Assigned: {job.assigned_staff_name}</Text>
            </View>
          )}
        </View>

        {renderActionButton()}
      </View>

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        jobId={job.id}
        amount={job.price || 0}
        plateNumber={job.plate_number}
      />
    </>
  );
};

const styles = StyleSheet.create({
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
  pending: {
    backgroundColor: '#fef3c7',
  },
  inProgress: {
    backgroundColor: '#dbeafe',
  },
  completed: {
    backgroundColor: '#d1fae5',
  },
  paid: {
    backgroundColor: '#a7f3d0',
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
});