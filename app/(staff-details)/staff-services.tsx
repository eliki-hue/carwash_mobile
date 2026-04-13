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
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';

interface Service {
  id: number;
  name: string;
  price: string;
  duration: number;
  description?: string;
}

interface Vehicle {
  id: number;
  name: string;
  type: string;
}

interface VehicleServicePrice {
  id: number;
  vehicle: number;
  service: number;
  price: string;
}

interface ServiceWithPrices {
  service: Service;
  prices: VehicleServicePrice[];
  vehicles: Map<number, Vehicle>;
}

export default function ServicesScreen() {
  const [servicesWithPrices, setServicesWithPrices] = useState<ServiceWithPrices[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceWithPrices | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const router = useRouter();
  const { role } = useAuth();
  const insets = useSafeAreaInsets();
  const isStaff = role === 'staff';
  const isOwner = role === 'owner';

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [servicesRes, vehiclesRes, pricesRes] = await Promise.all([
        api.get('/services/'),
        api.get('/vehicles/'),
        api.get('/pricing/'),
      ]);
      
      const servicesData = servicesRes.data;
      const vehiclesData = vehiclesRes.data;
      const pricesData = pricesRes.data;
      
      const vehicleMap = new Map();
      vehiclesData.forEach((vehicle: Vehicle) => {
        vehicleMap.set(vehicle.id, vehicle);
      });
      
      const servicesWithPricesMap = servicesData.map((service: Service) => {
        const servicePrices = pricesData.filter(
          (price: VehicleServicePrice) => price.service === service.id
        );
        
        return {
          service,
          prices: servicePrices,
          vehicles: vehicleMap,
        };
      });
      
      setServicesWithPrices(servicesWithPricesMap);
      setVehicles(vehiclesData);
      
      console.log('Data loaded successfully');
      console.log('Vehicles map size:', vehicleMap.size);
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatPrice = (price: string) => {
    return `KES ${parseFloat(price).toLocaleString()}`;
  };

  const getVehicleName = (vehicleId: number) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.name || `Vehicle #${vehicleId}`;
  };

  const getPriceForVehicle = (service: Service, vehicleId: number) => {
    const specificPricing = selectedService?.prices.find(p => p.vehicle === vehicleId);
    if (specificPricing) {
      return specificPricing.price;
    }
    return service.price;
  };

  const getPriceRange = (prices: VehicleServicePrice[]) => {
    if (prices.length === 0) return 'Price not set';
    const priceValues = prices.map(p => parseFloat(p.price));
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    
    if (minPrice === maxPrice) {
      return formatPrice(prices[0].price);
    }
    return `${formatPrice(minPrice.toString())} - ${formatPrice(maxPrice.toString())}`;
  };

  const ServiceDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Service Details</Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          
          {selectedService && (
            <ScrollView style={styles.detailsContainer}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="construct-outline" size={48} color="#3b82f6" />
              </View>
              
              <Text style={styles.serviceName}>{selectedService.service.name}</Text>
              
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="cash-outline" size={20} color="#059669" />
                    <Text style={styles.detailLabel}>Base Price</Text>
                  </View>
                  <Text style={styles.basePriceValue}>{formatPrice(selectedService.service.price)}</Text>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="time-outline" size={20} color="#3b82f6" />
                    <Text style={styles.detailLabel}>Duration</Text>
                  </View>
                  <Text style={styles.detailValue}>{selectedService.service.duration} minutes</Text>
                </View>
                
                {selectedService.service.description && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailLabelContainer}>
                        <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
                        <Text style={styles.detailLabel}>Description</Text>
                      </View>
                      <Text style={styles.descriptionText}>{selectedService.service.description}</Text>
                    </View>
                  </>
                )}
                
                <View style={styles.divider} />
                
                <View style={styles.pricesSection}>
                  <View style={styles.detailLabelContainer}>
                    <Ionicons name="car-outline" size={20} color="#3b82f6" />
                    <Text style={styles.detailLabel}>Prices by Vehicle</Text>
                  </View>
                  
                  {/* Show ALL vehicles, not just those with custom prices */}
                  {vehicles.map((vehicle) => {
                    const customPrice = selectedService.prices.find(p => p.vehicle === vehicle.id);
                    const displayPrice = customPrice ? customPrice.price : selectedService.service.price;
                    const hasCustom = !!customPrice;
                    
                    return (
                      <View key={vehicle.id} style={styles.priceRow}>
                        <View style={styles.vehicleInfo}>
                          <Ionicons name="car-outline" size={16} color="#6b7280" />
                          <View>
                            <Text style={styles.vehicleName}>{vehicle.name}</Text>
                            {hasCustom && (
                              <Text style={styles.customBadge}>Custom price</Text>
                            )}
                          </View>
                        </View>
                        <Text style={[styles.priceValue, hasCustom && styles.customPriceValue]}>
                          {formatPrice(displayPrice)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              
              {isStaff && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
                  <Text style={styles.infoText}>
                    Contact owner for service modifications or pricing changes
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderServiceCard = ({ item }: { item: ServiceWithPrices }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        setSelectedService(item);
        setShowDetailsModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.serviceIconContainer}>
          <Ionicons name="construct-outline" size={24} color="#3b82f6" />
        </View>
        <View style={styles.serviceHeaderInfo}>
          <Text style={styles.serviceName}>{item.service.name}</Text>
          <Text style={styles.durationText}>{item.service.duration} min</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.priceRangeContainer}>
          <Ionicons name="cash-outline" size={16} color="#059669" />
          <Text style={styles.priceRangeLabel}>Base Price:</Text>
          <Text style={styles.priceRangeValue}>{formatPrice(item.service.price)}</Text>
        </View>
        
        <View style={styles.vehicleCountContainer}>
          <Ionicons name="car-outline" size={16} color="#6b7280" />
          <Text style={styles.vehicleCountText}>
            Available for {vehicles.length} vehicle type{vehicles.length !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => {
            setSelectedService(item);
            setShowDetailsModal(true);
          }}
        >
          <Text style={styles.detailsButtonText}>View All Prices</Text>
          <Ionicons name="arrow-forward" size={16} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <Text style={styles.title}>Services</Text>
        <View style={styles.headerButtons}>
          <View style={styles.badge}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.badgeText}>{servicesWithPrices.length} Services</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={servicesWithPrices}
        keyExtractor={(item) => item.service.id.toString()}
        renderItem={renderServiceCard}
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
            title="No Services Found"
            message="No services have been added yet."
          />
        }
      />
      
      <ServiceDetailsModal />
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceHeaderInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#3b82f6',
  },
  cardContent: {
    padding: 16,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  priceRangeLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  priceRangeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  vehicleCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  vehicleCountText: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
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
    maxHeight: '90%',
  },
  detailIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  // serviceName: {
  //   fontSize: 20,
  //   fontWeight: '700',
  //   color: '#1f2937',
  //   textAlign: 'center',
  //   marginBottom: 16,
  // },
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
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  basePriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginLeft: 28,
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
  pricesSection: {
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  customBadge: {
    fontSize: 10,
    color: '#3b82f6',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  customPriceValue: {
    color: '#3b82f6',
  },
  noPriceText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 12,
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