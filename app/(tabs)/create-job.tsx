// app/create-job.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { useAuth } from '../../src/hooks/useAuth';

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

interface Staff {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function CreateJob() {
  const [plateNumber, setPlateNumber] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJob, setCreatedJob] = useState<any>(null);

  const router = useRouter();
  const { role } = useAuth();
  const isOwner = role === 'owner';
  const isStaff = role === 'staff';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const promises: any[] = [
        api.get('/services/'),
        api.get('/vehicles/'),
      ];
      
      promises.push(api.get('/auth/users/?role=staff'));
      
      const results = await Promise.all(promises);
      setServices(results[0].data);
      setVehicles(results[1].data);
      
      if (results[2]) {
        setStaffList(results[2].data);
      }
      
      // console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load services and vehicles');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPlateNumber('');
    setSelectedService(null);
    setSelectedVehicle(null);
    setSelectedStaff(null);
  };

  const handleCreateJob = async () => {
    // Validation
    if (!plateNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter plate number');
      return;
    }
    if (!selectedService) {
      Alert.alert('Validation Error', 'Please select a service');
      return;
    }
    if (!selectedVehicle) {
      Alert.alert('Validation Error', 'Please select a vehicle type');
      return;
    }

    setSubmitting(true);
    
    const requestData: any = {
      plate_number: plateNumber.toUpperCase(),
      service: selectedService.id,
      vehicle_type: selectedVehicle.id,
      status: 'pending',
    };
    
    // Add assigned staff if selected
    if (selectedStaff) {
      requestData.assigned_staff = selectedStaff.id;
    }
    
    console.log('Sending request data:', requestData);
    
    try {
      const response = await api.post('/jobs/', requestData);
      console.log('Response:', response.data);
      
      setCreatedJob(response.data);
      setShowSuccessModal(true);
      resetForm();
      
    } catch (error: any) {
      console.error('Error creating job:', error);
      if (error.response?.data) {
        Alert.alert('Error', error.response.data.message || 'Failed to create job');
      } else {
        Alert.alert('Error', 'Failed to create job. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewJobs = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const handleCreateAnother = () => {
    setShowSuccessModal(false);
  };

  const ServiceModal = () => (
    <Modal
      visible={showServiceModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowServiceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Service</Text>
            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.modalItem,
                  selectedService?.id === service.id && styles.modalItemActive
                ]}
                onPress={() => {
                  setSelectedService(service);
                  setShowServiceModal(false);
                }}
              >
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemTitle}>{service.name}</Text>
                  <Text style={styles.modalItemSubtitle}>
                    Duration: {service.duration} min
                  </Text>
                </View>
                <Text style={styles.modalItemPrice}>
                  KES {parseFloat(service.price).toLocaleString()}
                </Text>
                {selectedService?.id === service.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const VehicleModal = () => (
    <Modal
      visible={showVehicleModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowVehicleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Vehicle Type</Text>
            <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.modalItem,
                  selectedVehicle?.id === vehicle.id && styles.modalItemActive
                ]}
                onPress={() => {
                  setSelectedVehicle(vehicle);
                  setShowVehicleModal(false);
                }}
              >
                <Text style={styles.modalItemTitle}>{vehicle.name}</Text>
                {selectedVehicle?.id === vehicle.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const StaffModal = () => (
    <Modal
      visible={showStaffModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowStaffModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Staff</Text>
            <TouchableOpacity onPress={() => setShowStaffModal(false)}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            <TouchableOpacity
              style={[
                styles.modalItem,
                !selectedStaff && styles.modalItemActive
              ]}
              onPress={() => {
                setSelectedStaff(null);
                setShowStaffModal(false);
              }}
            >
              <Text style={styles.modalItemTitle}>Unassigned</Text>
              {!selectedStaff && (
                <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
              )}
            </TouchableOpacity>
            
            {staffList.map((staff) => (
              <TouchableOpacity
                key={staff.id}
                style={[
                  styles.modalItem,
                  selectedStaff?.id === staff.id && styles.modalItemActive
                ]}
                onPress={() => {
                  setSelectedStaff(staff);
                  setShowStaffModal(false);
                }}
              >
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemTitle}>{staff.username}</Text>
                  <Text style={styles.modalItemSubtitle}>{staff.email}</Text>
                </View>
                {selectedStaff?.id === staff.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const SuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={styles.successModalOverlay}>
        <View style={styles.successModalContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>Job Created Successfully!</Text>
          <Text style={styles.successMessage}>
            Job has been added to the pending list
          </Text>
          
          {createdJob && (
            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Plate Number:</Text>
                <Text style={styles.successDetailValue}>{createdJob.plate_number}</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Service:</Text>
                <Text style={styles.successDetailValue}>
                  {services.find(s => s.id === createdJob.service)?.name || 'Selected Service'}
                </Text>
              </View>
              {createdJob.assigned_staff && (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Assigned To:</Text>
                  <Text style={styles.successDetailValue}>
                    {staffList.find(s => s.id === createdJob.assigned_staff)?.username || 'Staff Member'}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          <View style={styles.successButtons}>
            <TouchableOpacity 
              style={[styles.successButton, styles.createAnotherButton]}
              onPress={handleCreateAnother}
            >
              <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.createAnotherButtonText}>Create Another</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.successButton, styles.viewJobsButton]}
              onPress={handleViewJobs}
            >
              <Ionicons name="eye-outline" size={20} color="#fff" />
              <Text style={styles.viewJobsButtonText}>View Jobs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Job</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Plate Number Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Plate Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="car-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., ABC 1234"
                placeholderTextColor="#9ca3af"
                value={plateNumber}
                onChangeText={setPlateNumber}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {plateNumber.length > 0 && (
                <TouchableOpacity onPress={() => setPlateNumber('')}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Service Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Select Service <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={styles.selectorCard}
              onPress={() => setShowServiceModal(true)}
            >
              {selectedService ? (
                <View style={styles.selectedItem}>
                  <View>
                    <Text style={styles.selectedItemTitle}>{selectedService.name}</Text>
                    <Text style={styles.selectedItemSubtitle}>
                      Duration: {selectedService.duration} min
                    </Text>
                  </View>
                  <Text style={styles.selectedItemPrice}>
                    KES {parseFloat(selectedService.price).toLocaleString()}
                  </Text>
                </View>
              ) : (
                <View style={styles.placeholderContent}>
                  <Ionicons name="construct-outline" size={32} color="#9ca3af" />
                  <Text style={styles.placeholderText}>Tap to select a service</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Vehicle Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Vehicle Type <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={styles.selectorCard}
              onPress={() => setShowVehicleModal(true)}
            >
              {selectedVehicle ? (
                <View style={styles.selectedItem}>
                  <Text style={styles.selectedItemTitle}>{selectedVehicle.name}</Text>
                </View>
              ) : (
                <View style={styles.placeholderContent}>
                  <Ionicons name="car-sport-outline" size={32} color="#9ca3af" />
                  <Text style={styles.placeholderText}>Tap to select vehicle type</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Staff Assignment */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assign Staff (Optional)</Text>
            <TouchableOpacity 
              style={styles.selectorCard}
              onPress={() => setShowStaffModal(true)}
            >
              {selectedStaff ? (
                <View style={styles.selectedItem}>
                  <View>
                    <Text style={styles.selectedItemTitle}>{selectedStaff.username}</Text>
                    <Text style={styles.selectedItemSubtitle}>{selectedStaff.email}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.placeholderContent}>
                  <Ionicons name="people-outline" size={32} color="#9ca3af" />
                  <Text style={styles.placeholderText}>Tap to assign staff (optional)</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Summary */}
          {selectedService && selectedVehicle && plateNumber && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Job Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Plate Number:</Text>
                <Text style={styles.summaryValue}>{plateNumber.toUpperCase()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service:</Text>
                <Text style={styles.summaryValue}>{selectedService.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Vehicle:</Text>
                <Text style={styles.summaryValue}>{selectedVehicle.name}</Text>
              </View>
              {selectedStaff && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Assigned To:</Text>
                  <Text style={styles.summaryValue}>{selectedStaff.username}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Amount:</Text>
                <Text style={styles.summaryPrice}>
                  KES {parseFloat(selectedService.price).toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (!plateNumber || !selectedService || !selectedVehicle) && styles.createButtonDisabled
            ]}
            onPress={handleCreateJob}
            disabled={!plateNumber || !selectedService || !selectedVehicle || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.createButtonText}>Create Job</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ServiceModal />
      <VehicleModal />
      <StaffModal />
      <SuccessModal />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
  },
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    minHeight: 80,
  },
  placeholderContent: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  selectedItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedItemSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalList: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemActive: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  modalItemSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalItemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
    marginRight: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  successDetails: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  successDetailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  successDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  successButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  successButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  createAnotherButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  createAnotherButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  viewJobsButton: {
    backgroundColor: '#3b82f6',
  },
  viewJobsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});