// src/components/JobCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Job } from '../src/types';

interface JobCardProps {
  job: Job;
  onAction: (jobId: number) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onAction }) => {
  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return styles.pending;
      case 'in_progress':
        return styles.inProgress;
      case 'completed':
        return styles.completed;
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
      default:
        return job.status;
    }
  };

  const getButtonText = () => {
    if (job.status === 'pending') return 'Start Job';
    if (job.status === 'in_progress') return 'Complete Job';
    return null;
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

  const showActionButton = job.status !== 'completed';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, getStatusColor()]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        <Text style={styles.time}>{formatTime(job.created_at)}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.plateNumber}>{job.plate_number}</Text>
        <Text style={styles.serviceName}>{job.service_name || 'Service'}</Text>
        {job.assigned_staff && (
          <Text style={styles.staff}>👤 {job.assigned_staff}</Text>
        )}
      </View>

      {showActionButton && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            job.status === 'pending' ? styles.startButton : styles.completeButton,
          ]}
          onPress={() => onAction(job.id)}
        >
          <Text style={styles.actionButtonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: '#6b7280',
  },
  content: {
    marginBottom: 12,
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  staff: {
    fontSize: 13,
    color: '#9ca3af',
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
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