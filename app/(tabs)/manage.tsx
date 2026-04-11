// app/(tabs)/manage.tsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Manage() {
  const router = useRouter();

  const menuItems = [
    {
      id: 'vehicle-types',
      title: 'Vehicle Types',
      description: 'Manage vehicle categories (Sedan, SUV, Truck, etc.)',
      icon: 'car',
      color: '#3b82f6',
      route: '/(tabs)/vehicle-types'
    },
    {
      id: 'services',
      title: 'Services & Pricing',
      description: 'Configure services and vehicle-specific pricing',
      icon: 'construct',
      color: '#10b981',
      route: '/(tabs)/services'
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Add, edit, or remove staff accounts',
      icon: 'people',
      color: '#f59e0b',
      route: '/(tabs)/users'
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Management</Text>
        <Text style={styles.subtitle}>Configure your car wash system</Text>
      </View>

      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => router.push(item.route as any)}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
            <Ionicons name={item.icon as any} size={28} color={item.color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
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
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
});