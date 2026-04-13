// app/(tabs)/vehicle-types.tsx
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
} from 'react-native';
import api from '../../src/services/api';
import { VehicleType } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

export default function VehicleTypesScreen() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [vehicleName, setVehicleName] = useState('');

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const fetchVehicleTypes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vehicles/');
      setVehicleTypes(response.data);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      Alert.alert('Error', 'Failed to load vehicle types');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!vehicleName.trim()) {
      Alert.alert('Error', 'Please enter vehicle type name');
      return;
    }

    setSubmitting(true);
    try {
      if (editingVehicle) {
        // Update existing vehicle type
        await api.patch(`/vehicles/${editingVehicle.id}/`, {
          name: vehicleName,
        });
        Alert.alert('Success', 'Vehicle type updated successfully');
      } else {
        // Create new vehicle type
        await api.post('/vehicles/', {
          name: vehicleName,
        });
        Alert.alert('Success', 'Vehicle type created successfully');
      }
      
      setModalVisible(false);
      resetForm();
      fetchVehicleTypes();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save vehicle type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vehicle: VehicleType) => {
    // Check if vehicle type is used in any pricing
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${vehicle.name}"? This will also remove all pricing associated with this vehicle type.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/vehicles/${vehicle.id}/`);
              Alert.alert('Success', 'Vehicle type deleted successfully');
              fetchVehicleTypes();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete vehicle type');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (vehicle: VehicleType) => {
    setEditingVehicle(vehicle);
    setVehicleName(vehicle.name);
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setVehicleName('');
  };

  const renderVehicleCard = ({ item }: { item: VehicleType }) => {
    return (
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleInfo}>
          <Ionicons name="car" size={24} color="#3b82f6" />
          <Text style={styles.vehicleName}>{item.name}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading vehicle types...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Types</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Ionicons name="add-circle" size={32} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicleTypes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderVehicleCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No vehicle types yet</Text>
            <Text style={styles.emptySubtext}>
              Add vehicle types like Sedan, SUV, Truck, etc.
            </Text>
          </View>
        }
      />

      {/* Add/Edit Vehicle Type Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingVehicle ? 'Edit Vehicle Type' : 'Add Vehicle Type'}
              </Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                resetForm();
              }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Type Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Sedan, SUV, Truck, Van"
                  value={vehicleName}
                  onChangeText={setVehicleName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.infoText}>
                  Vehicle types are used to set different prices for services.
                  For example: SUV might cost more than Sedan for the same service.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, !vehicleName && styles.submitButtonDisabled]}
                onPress={handleSave}
                disabled={!vehicleName || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingVehicle ? 'Update' : 'Create'} Vehicle Type
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
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
});