// src/hooks/useJobs.ts
import { useState, useCallback } from 'react';
import api from '../services/api';
import { Job } from '../types';

export const useJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/jobs/?status=${status}`);
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const startJob = useCallback(async (jobId: number) => {
    try {
      await api.post(`/jobs/${jobId}/start/`);
      // Update local state
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, status: 'in_progress' } : job
        )
      );
      return true;
    } catch (error) {
      console.error('Error starting job:', error);
      return false;
    }
  }, []);

  const completeJob = useCallback(async (jobId: number) => {
    try {
      await api.patch(`/jobs/${jobId}/complete/`);
      // Update local state
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, status: 'completed' } : job
        )
      );
      return true;
    } catch (error) {
      console.error('Error completing job:', error);
      return false;
    }
  }, []);

  const refreshJobs = useCallback(async (status: string) => {
    setRefreshing(true);
    await fetchJobs(status);
    setRefreshing(false);
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    refreshing,
    fetchJobs,
    startJob,
    completeJob,
    refreshJobs,
  };
};