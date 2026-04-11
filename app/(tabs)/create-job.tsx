// app/(tabs)/create-job.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { Service, Vehicle, ServicePricing } from '../../src/types';

export default function CreateJobScreen() {
  const [plateNumber, setPlateNumber] = useState('');
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pricing, setPricing] = useState<ServicePricing[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Dropdown states
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    calculatePrice();
  }, [selectedService, selectedVehicle]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [servicesRes, vehiclesRes, pricingRes] = await Promise.all([
        api.get('/services/'),
        api.get('/vehicles/'),
        api.get('/pricing/'), // This returns ServicePricing objects
      ]);
      
      setServices(servicesRes.data);
      setVehicles(vehiclesRes.data);
      setPricing(pricingRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!selectedService || !selectedVehicle) {
      setCalculatedPrice(null);
      setPriceError(null);
      return;
    }

    // Find matching pricing entry from ServicePricing
    const priceEntry = pricing.find(
      p => p.service === selectedService && p.vehicle_type === selectedVehicle
    );

    if (priceEntry) {
      setCalculatedPrice(priceEntry.price);
      setPriceError(null);
    } else {
      setCalculatedPrice(null);
      setPriceError('Pricing not configured for this service and vehicle combination');
    }
  };

  const handleSubmit = async () => {
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
    
    if (priceError) {
      Alert.alert('Validation Error', `Cannot create job: ${priceError}`);
      return;
    }

    setSubmitting(true);
    try {
      // Send exactly what backend expects
      const jobData = {
        plate_number: plateNumber.toUpperCase().trim(),
        service: selectedService,
        vehicle_type: selectedVehicle,
      };
      
      console.log('Creating job with data:', jobData);
      
      const response = await api.post('/jobs/', jobData);
      
      Alert.alert(
        'Success', 
        `Job created successfully!\nPrice: KES ${calculatedPrice?.toLocaleString()}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error creating job:', error.response?.data || error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail || 
                          'Failed to create job. Please try again.';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getServiceName = (id: number) => {
    const service = services.find(s => s.id === id);
    return service?.name || 'Select service';
  };

  const getVehicleName = (id: number) => {
    const vehicle = vehicles.find(v => v.id === id);
    return vehicle?.name || 'Select vehicle';
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading services and pricing...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Job</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.form}>
        {/* Plate Number Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Plate Number <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons name="car-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., KDA 123A"
              placeholderTextColor="#9ca3af"
              value={plateNumber}
              onChangeText={setPlateNumber}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!submitting}
            />
            {plateNumber.length > 0 && !submitting && (
              <TouchableOpacity onPress={() => setPlateNumber('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Service Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Service <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              if (!submitting) {
                setShowServiceDropdown(true);
                setSearchQuery('');
              }
            }}
          >
            <Text style={selectedService ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedService ? getServiceName(selectedService) : 'Select a service'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Vehicle Type Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Vehicle Type <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              if (!submitting && selectedService) {
                setShowVehicleDropdown(true);
                setSearchQuery('');
              } else if (!selectedService) {
                Alert.alert('Info', 'Please select a service first');
              }
            }}
          >
            <Text style={selectedVehicle ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedVehicle ? getVehicleName(selectedVehicle) : 'Select vehicle type'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          {!selectedService && (
            <Text style={styles.hintText}>Select a service to see available vehicles</Text>
          )}
        </View>

        {/* Price Preview Card */}
        {(selectedService && selectedVehicle) && (
          <View style={styles.priceCard}>
            <View style={styles.priceHeader}>
              <Ionicons name="calculator-outline" size={20} color="#3b82f6" />
              <Text style={styles.priceTitle}>Price Preview</Text>
            </View>
            
            {priceError ? (
              <View style={styles.priceErrorContainer}>
                <Ionicons name="alert-circle" size={24} color="#ef4444" />
                <Text style={styles.priceErrorText}>{priceError}</Text>
                <Text style={styles.priceErrorHint}>
                  Please contact administrator to configure pricing for this combination.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.priceBreakdown}>
                  <Text style={styles.breakdownText}>
                    {getServiceName(selectedService)} + {getVehicleName(selectedVehicle)}
                  </Text>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceTotal}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <View style={styles.totalAmount}>
                      <Text style={styles.currencySymbol}>KES</Text>
                      <Text style={styles.totalValue}>{calculatedPrice?.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Summary Section */}
        {(plateNumber && selectedService && selectedVehicle && !priceError) && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Job Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Plate Number:</Text>
              <Text style={styles.summaryValue}>{plateNumber.toUpperCase()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service:</Text>
              <Text style={styles.summaryValue}>{getServiceName(selectedService)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vehicle:</Text>
              <Text style={styles.summaryValue}>{getVehicleName(selectedVehicle)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.summaryLabel}>Total Price:</Text>
              <Text style={styles.totalPriceValue}>KES {calculatedPrice?.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!plateNumber || !selectedService || !selectedVehicle || priceError || submitting) && 
            styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!plateNumber || !selectedService || !selectedVehicle || !!priceError || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Create Job</Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Service Selection Modal */}
      <Modal
        visible={showServiceDropdown}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowServiceDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service</Text>
              <TouchableOpacity onPress={() => setShowServiceDropdown(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search services..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredServices}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedService === item.id && styles.modalItemActive
                  ]}
                  onPress={() => {
                    setSelectedService(item.id);
                    setSelectedVehicle(null); // Reset vehicle when service changes
                    setCalculatedPrice(null);
                    setShowServiceDropdown(false);
                  }}
                >
                  <View style={styles.modalItemContent}>
                    <Text style={[
                      styles.modalItemText,
                      selectedService === item.id && styles.modalItemTextActive
                    ]}>
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text style={styles.modalItemDescription}>{item.description}</Text>
                    )}
                  </View>
                  {selectedService === item.id && (
                    <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Vehicle Type Selection Modal */}
      <Modal
        visible={showVehicleDropdown}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVehicleDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle Type</Text>
              <TouchableOpacity onPress={() => setShowVehicleDropdown(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search vehicle types..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredVehicles}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                // Check if pricing exists for this vehicle with selected service
                const hasPricing = pricing.some(
                  p => p.service === selectedService && p.vehicle_type === item.id
                );
                
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedVehicle === item.id && styles.modalItemActive,
                      !hasPricing && styles.modalItemDisabled
                    ]}
                    onPress={() => {
                      if (hasPricing) {
                        setSelectedVehicle(item.id);
                        setShowVehicleDropdown(false);
                      }  else {
                          // Safe way to show the alert
                          const serviceName = selectedService 
                            ? getServiceName(selectedService) 
                            : 'the selected service';
                          
                          Alert.alert(
                            'Pricing Not Available',
                            `No pricing configured for ${serviceName} on ${item.name}. Please contact administrator.`
                          );
                        }
                    }}
                  >
                    <View style={styles.modalItemContent}>
                      <Text style={[
                        styles.modalItemText,
                        selectedVehicle === item.id && styles.modalItemTextActive,
                        !hasPricing && styles.modalItemTextDisabled
                      ]}>
                        {item.name}
                      </Text>
                      {!hasPricing && (
                        <Text style={styles.modalItemWarning}>No pricing available</Text>
                      )}
                    </View>
                    {selectedVehicle === item.id && hasPricing && (
                      <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  hintText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  priceCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  priceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  priceBreakdown: {
    gap: 12,
  },
  breakdownText: {
    fontSize: 14,
    color: '#3b82f6',
    textAlign: 'center',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#bfdbfe',
  },
  priceTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e40af',
  },
  totalAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e40af',
  },
  priceErrorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  priceErrorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  },
  priceErrorHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    fontWeight: '600',
    color: '#1f2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemActive: {
    backgroundColor: '#eff6ff',
  },
  modalItemDisabled: {
    opacity: 0.5,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  modalItemTextActive: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  modalItemTextDisabled: {
    color: '#9ca3af',
  },
  modalItemDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  modalItemWarning: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 2,
  },
});