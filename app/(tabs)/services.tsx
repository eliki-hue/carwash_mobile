// app/(tabs)/services.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

interface Vehicle {
  id: number;
  name: string;
}

interface Service {
  id: number;
  name: string;
  price: string;
  duration: number;
}

interface ServicePricing {
  id: number;
  service: number;
  vehicle_type: number;
  vehicle_name?: string;
  price: string;
}

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pricing, setPricing] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editingPricing, setEditingPricing] = useState<ServicePricing | null>(null);
  
  // Service form states
  const [submitting, setSubmitting] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  
  // Pricing form
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [priceAmount, setPriceAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesRes, vehiclesRes, pricingRes] = await Promise.all([
        api.get('/services/'),
        api.get('/vehicles/'),
        api.get('/pricing/'),
      ]);
      setServices(servicesRes.data);
      setVehicles(vehiclesRes.data);
      setPricing(pricingRes.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new service with base price
  const handleCreateService = async () => {
    if (!serviceName.trim()) {
      Alert.alert('Error', 'Please enter service name');
      return;
    }
    
    if (!servicePrice || parseFloat(servicePrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid base price');
      return;
    }
    
    if (!serviceDuration || parseInt(serviceDuration) <= 0) {
      Alert.alert('Error', 'Please enter a valid duration in minutes');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/services/', {
        name: serviceName,
        price: parseFloat(servicePrice),
        duration: parseInt(serviceDuration),
      });
      
      Alert.alert('Success', 'Service created successfully!', [
        { 
          text: 'Add Vehicle Pricing', 
          onPress: () => {
            setSelectedService(response.data);
            setShowServiceModal(false);
            setShowPricingModal(true);
            resetServiceForm();
          }
        },
        { 
          text: 'OK', 
          onPress: () => {
            setShowServiceModal(false);
            resetServiceForm();
            fetchData();
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create service');
    } finally {
      setSubmitting(false);
    }
  };

  // Update base service price
  const handleUpdateBasePrice = async (service: Service) => {
    Alert.prompt(
      'Update Base Price',
      `Current base price: KES ${service.price}\nEnter new base price:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (newPrice) => {
            if (!newPrice || parseFloat(newPrice) <= 0) {
              Alert.alert('Error', 'Please enter a valid price');
              return;
            }
            
            try {
              await api.patch(`/services/${service.id}/`, {
                price: parseFloat(newPrice),
              });
              Alert.alert('Success', 'Base price updated successfully');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to update base price');
            }
          }
        }
      ],
      'plain-text',
      undefined,
      service.price.toString()
    );
  };

  // Add or update vehicle-specific pricing
  const handleSavePricing = async () => {
    if (!selectedService) {
      Alert.alert('Error', 'No service selected');
      return;
    }
    
    if (!selectedVehicle) {
      Alert.alert('Error', 'Please select a vehicle type');
      return;
    }
    
    if (!priceAmount || parseFloat(priceAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPricing) {
        // Update existing pricing
        await api.patch(`/pricing/${editingPricing.id}/`, {
          price: parseFloat(priceAmount),
        });
        Alert.alert('Success', 'Pricing updated successfully');
      } else {
        // Create new pricing
        await api.post('/pricing/', {
          service: selectedService.id,
          vehicle_type: selectedVehicle,
          price: parseFloat(priceAmount),
        });
        Alert.alert('Success', 'Vehicle pricing added successfully');
      }
      
      resetPricingForm();
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save pricing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPricing = (pricingItem: ServicePricing) => {
    setEditingPricing(pricingItem);
    setSelectedVehicle(pricingItem.vehicle_type);
    setPriceAmount(pricingItem.price.toString());
    setShowPricingModal(true);
  };

  const handleDeletePricing = async (pricingId: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this vehicle pricing? The service will use the base price for this vehicle.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/pricing/${pricingId}/`);
              Alert.alert('Success', 'Pricing removed successfully');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove pricing');
            }
          }
        }
      ]
    );
  };

  const resetServiceForm = () => {
    setServiceName('');
    setServicePrice('');
    setServiceDuration('');
  };

  const resetPricingForm = () => {
    setSelectedVehicle(null);
    setPriceAmount('');
    setEditingPricing(null);
    setShowPricingModal(false);
    setSelectedService(null);
  };

  const getPricingForService = (serviceId: number) => {
    return pricing.filter(p => p.service === serviceId);
  };

  const getVehicleName = (vehicleId: number) => {
    return vehicles.find(v => v.id === vehicleId)?.name || 'Unknown';
  };

  const getPriceForVehicle = (service: Service, vehicleId: number) => {
    const specificPricing = pricing.find(
      p => p.service === service.id && p.vehicle_type === vehicleId
    );
    return specificPricing ? parseFloat(specificPricing.price) : parseFloat(service.price);
  };

  const renderServiceCard = ({ item }: { item: Service }) => {
    const servicePricing = getPricingForService(item.id);
    const basePrice = parseFloat(item.price);

    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{item.name}</Text>
            <View style={styles.basePriceContainer}>
              <Text style={styles.basePriceLabel}>Base Price:</Text>
              <Text style={styles.basePrice}>KES {basePrice.toLocaleString()}</Text>
              <TouchableOpacity onPress={() => handleUpdateBasePrice(item)}>
                <Ionicons name="pencil" size={16} color="#3b82f6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.duration}>⏱️ {item.duration} minutes</Text>
          </View>
          <TouchableOpacity
            style={styles.addPricingButton}
            onPress={() => {
              setSelectedService(item);
              setEditingPricing(null);
              setSelectedVehicle(null);
              setPriceAmount('');
              setShowPricingModal(true);
            }}
          >
            <Ionicons name="add-circle" size={24} color="#3b82f6" />
            <Text style={styles.addPricingText}>Add Vehicle Price</Text>
          </TouchableOpacity>
        </View>

        {/* Pricing Table */}
        <View style={styles.pricingTable}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingHeaderText}>Vehicle Type</Text>
            <Text style={styles.pricingHeaderText}>Price (KES)</Text>
            <Text style={styles.pricingHeaderText}>vs Base</Text>
            <View style={{ width: 40 }} />
          </View>
          
          {vehicles.map((vehicle) => {
            const vehiclePrice = getPriceForVehicle(item, vehicle.id);
            const hasSpecificPricing = servicePricing.some(p => p.vehicle_type === vehicle.id);
            const priceDifference = vehiclePrice - basePrice;
            
            return (
              <View key={vehicle.id} style={styles.pricingRow}>
                <Text style={styles.vehicleName}>{vehicle.name}</Text>
                <Text style={[
                  styles.priceValue,
                  hasSpecificPricing && styles.specificPrice
                ]}>
                  KES {vehiclePrice.toLocaleString()}
                </Text>
                <Text style={[
                  styles.priceDifference,
                  priceDifference > 0 && styles.higherPrice,
                  priceDifference < 0 && styles.lowerPrice,
                  priceDifference === 0 && styles.samePrice
                ]}>
                  {priceDifference > 0 && `+${priceDifference}`}
                  {priceDifference < 0 && `${priceDifference}`}
                  {priceDifference === 0 && 'Base'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const specificPricing = servicePricing.find(p => p.vehicle_type === vehicle.id);
                    if (specificPricing) {
                      handleEditPricing(specificPricing);
                    } else {
                      setSelectedService(item);
                      setSelectedVehicle(vehicle.id);
                      setPriceAmount(basePrice.toString());
                      setEditingPricing(null);
                      setShowPricingModal(true);
                    }
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons 
                    name={hasSpecificPricing ? "pencil" : "add-circle-outline"} 
                    size={20} 
                    color={hasSpecificPricing ? "#3b82f6" : "#10b981"} 
                  />
                </TouchableOpacity>
                {hasSpecificPricing && (
                  <TouchableOpacity
                    onPress={() => {
                      const specificPricing = servicePricing.find(p => p.vehicle_type === vehicle.id);
                      if (specificPricing) handleDeletePricing(specificPricing.id);
                    }}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={16} color="#6b7280" />
          <Text style={styles.infoNoteText}>
            Specific vehicle prices override the base price. Leave empty to use base price.
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Services & Pricing</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowServiceModal(true)}
        >
          <Ionicons name="add-circle" size={32} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderServiceCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No services yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to create your first service
            </Text>
          </View>
        }
      />

      {/* Modal: Create Service */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Service</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Basic Wash, Premium Polish"
                  value={serviceName}
                  onChangeText={setServiceName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Base Price (KES) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 500"
                  value={servicePrice}
                  onChangeText={setServicePrice}
                  keyboardType="numeric"
                />
                <Text style={styles.hintText}>
                  This is the default price for standard vehicles
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Duration (minutes) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 30"
                  value={serviceDuration}
                  onChangeText={setServiceDuration}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.infoText}>
                  After creating the service, you can add different prices for specific vehicle types (e.g., SUV +200 KES, Truck +300 KES).
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (!serviceName || !servicePrice || !serviceDuration) && styles.submitButtonDisabled]}
                onPress={handleCreateService}
                disabled={!serviceName || !servicePrice || !serviceDuration || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Service</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Add/Edit Vehicle Pricing */}
      <Modal
        visible={showPricingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPricingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPricing ? 'Edit' : 'Add'} Vehicle Pricing
              </Text>
              <Text style={styles.modalSubtitle}>{selectedService?.name}</Text>
              <TouchableOpacity onPress={() => setShowPricingModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Type *</Text>
                <View style={styles.vehicleGrid}>
                  {vehicles.map((vehicle) => {
                    const isSelected = selectedVehicle === vehicle.id;
                    const existingPricing = pricing.find(
                      p => p.service === selectedService?.id && p.vehicle_type === vehicle.id
                    );
                    
                    return (
                      <TouchableOpacity
                        key={vehicle.id}
                        style={[
                          styles.vehicleOption,
                          isSelected && styles.vehicleOptionActive,
                          existingPricing && existingPricing.id !== editingPricing?.id && styles.vehicleOptionDisabled
                        ]}
                        onPress={() => {
                          if (!existingPricing || existingPricing.id === editingPricing?.id) {
                            setSelectedVehicle(vehicle.id);
                            if (!editingPricing && selectedService) {
                              // Pre-fill with base price
                              setPriceAmount(selectedService.price);
                            }
                          } else {
                            Alert.alert('Not Available', 'Pricing already exists for this vehicle. Edit existing entry instead.');
                          }
                        }}
                        disabled={existingPricing && existingPricing.id !== editingPricing?.id}
                      >
                        <Text style={[
                          styles.vehicleOptionText,
                          isSelected && styles.vehicleOptionTextActive,
                          existingPricing && existingPricing.id !== editingPricing?.id && styles.vehicleOptionTextDisabled
                        ]}>
                          {vehicle.name}
                        </Text>
                        {existingPricing && (
                          <Text style={styles.existingPriceBadge}>
                            Current: KES {parseFloat(existingPricing.price).toLocaleString()}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price (KES) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 500"
                  value={priceAmount}
                  onChangeText={setPriceAmount}
                  keyboardType="numeric"
                />
                {selectedService && selectedVehicle && (
                  <Text style={styles.compareText}>
                    Base price: KES {parseFloat(selectedService.price).toLocaleString()}
                    {parseFloat(priceAmount) > parseFloat(selectedService.price) && 
                      ` (+${(parseFloat(priceAmount) - parseFloat(selectedService.price)).toLocaleString()})`}
                    {parseFloat(priceAmount) < parseFloat(selectedService.price) && 
                      ` (${(parseFloat(priceAmount) - parseFloat(selectedService.price)).toLocaleString()})`}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (!selectedVehicle || !priceAmount) && styles.submitButtonDisabled]}
                onPress={handleSavePricing}
                disabled={!selectedVehicle || !priceAmount || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingPricing ? 'Update Pricing' : 'Save Pricing'}
                  </Text>
                )}
              </TouchableOpacity>

              {editingPricing && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={resetPricingForm}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  basePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  basePriceLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  basePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },
  duration: {
    fontSize: 12,
    color: '#6b7280',
  },
  addPricingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addPricingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3b82f6',
  },
  pricingTable: {
    padding: 16,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 8,
  },
  pricingHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 2,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 2,
  },
  specificPrice: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  priceDifference: {
    fontSize: 12,
    flex: 1.5,
  },
  higherPrice: {
    color: '#ef4444',
  },
  lowerPrice: {
    color: '#10b981',
  },
  samePrice: {
    color: '#6b7280',
  },
  actionButton: {
    width: 40,
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    alignItems: 'center',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    gap: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  modalForm: {
    padding: 20,
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
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  compareText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  vehicleGrid: {
    gap: 10,
  },
  vehicleOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  vehicleOptionActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  vehicleOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#f3f4f6',
  },
  vehicleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  vehicleOptionTextActive: {
    color: '#3b82f6',
  },
  vehicleOptionTextDisabled: {
    color: '#9ca3af',
  },
  existingPriceBadge: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#3b82f6',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
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
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
});