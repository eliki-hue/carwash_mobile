// app/(tabs)/vehicles.tsx
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';

interface Vehicle {
  id: number;
  name: string;
  type?: string;
  description?: string;
}

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const router = useRouter()
  const { role } = useAuth();
  const insets = useSafeAreaInsets();
  const isStaff = role === 'staff';

  useEffect(() => {
    loadVehicles();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [])
  );

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vehicles/');
      setVehicles(response.data);
    } catch (error: any) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const VehicleDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Vehicle Details</Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          
          {selectedVehicle && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="car-outline" size={48} color="#3b82f6" />
              </View>
              
              <Text style={styles.vehicleName}>{selectedVehicle.name}</Text>
              
              <View style={styles.detailCard}>
                {selectedVehicle.type && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelContainer}>
                      <Ionicons name="options-outline" size={20} color="#6b7280" />
                      <Text style={styles.detailLabel}>Type</Text>
                    </View>
                    <Text style={styles.detailValue}>{selectedVehicle.type}</Text>
                  </View>
                )}
                
                {selectedVehicle.description && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailLabelContainer}>
                        <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
                        <Text style={styles.detailLabel}>Description</Text>
                      </View>
                      <Text style={styles.descriptionText}>{selectedVehicle.description}</Text>
                    </View>
                  </>
                )}
              </View>
              
              {isStaff && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
                  <Text style={styles.infoText}>
                    Contact owner for vehicle type modifications
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderVehicleCard = ({ item }: { item: Vehicle }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        setSelectedVehicle(item);
        setShowDetailsModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.vehicleIconContainer}>
          <Ionicons name="car-outline" size={32} color="#3b82f6" />
        </View>
        
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{item.name}</Text>
          {item.type && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{item.type}</Text>
            </View>
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <Text style={styles.title}>Vehicles</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{vehicles.length} Types</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderVehicleCard}
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
            title="No Vehicles Found"
            message="No vehicle types have been added yet."
          />
        }
      />
      
      <VehicleDetailsModal />
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
  badge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  vehicleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
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
    fontWeight: '700',
    color: '#1f2937',
  },
  detailsContainer: {
    padding: 20,
  },
  detailIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 28,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginLeft: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#3b82f6',
  },
});