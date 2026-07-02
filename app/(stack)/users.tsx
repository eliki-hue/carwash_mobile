// app/(stack)/users.tsx - Fixed edit functionality
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../../src/services/userServices';
import { User } from '../../src/types/user';
import { UserFormModal } from '../../components/UserFormModal';
import { ResetPasswordModal } from '../../components/ResetPasswordModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';

type FilterType = 'all' | 'staff' | 'owner' | 'active' | 'inactive';

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [showMenuFor, setShowMenuFor] = useState<number | null>(null);

  const insets = useSafeAreaInsets();

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data);
      filterUsers(data, searchQuery, activeFilter);
    } catch (error: any) {
      console.error('Error loading users:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load users';
      Alert.alert('Error', errorMessage);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const filterUsers = useCallback((data: User[], query: string, filter: FilterType) => {
    let filtered = data;

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(lowerQuery) ||
          user.full_name?.toLowerCase().includes(lowerQuery) ||
          user.email?.toLowerCase().includes(lowerQuery) ||
          user.phone_number?.includes(query)
      );
    }

    switch (filter) {
      case 'staff':
        filtered = filtered.filter((user) => user.role === 'staff');
        break;
      case 'owner':
        filtered = filtered.filter((user) => user.role === 'owner');
        break;
      case 'active':
        filtered = filtered.filter((user) => user.is_active === true);
        break;
      case 'inactive':
        filtered = filtered.filter((user) => user.is_active === false);
        break;
      default:
        break;
    }

    setFilteredUsers(filtered);
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    filterUsers(users, text, activeFilter);
  }, [users, activeFilter, filterUsers]);

  const handleFilter = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    filterUsers(users, searchQuery, filter);
  }, [users, searchQuery, filterUsers]);

  const handleCreateUser = useCallback(async (data: any) => {
    await userService.createUser(data);
    Alert.alert('Success', 'User created successfully');
    await loadUsers();
  }, [loadUsers]);

  const handleUpdateUser = useCallback(async (data: any, userId?: number) => {
    if (!userId) return;
    console.log('Updating user:', userId, data);
    await userService.updateUser(userId, data);
    Alert.alert('Success', 'User updated successfully');
    await loadUsers();
  }, [loadUsers]);

  const handleResetPassword = useCallback(async (password: string) => {
    if (!resetUser) return;
    await userService.resetPassword(resetUser.id, { password, confirm_password: password });
    setShowResetModal(false);
    setResetUser(null);
    Alert.alert('Success', 'Password reset successfully');
  }, [resetUser]);

  const handleDeactivate = useCallback((user: User) => {
    Alert.alert(
      'Confirm Deactivate',
      `Deactivate ${user.full_name || user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.deactivateUser(user.id);
              Alert.alert('Success', 'User deactivated successfully');
              await loadUsers();
            } catch (error: any) {
              const errorMessage = error.response?.data?.message || 'Failed to deactivate user';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  }, [loadUsers]);

  const handleActivate = useCallback(async (user: User) => {
    Alert.alert(
      'Confirm Activate',
      `Activate ${user.full_name || user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              await userService.activateUser(user.id);
              Alert.alert('Success', 'User activated successfully');
              await loadUsers();
            } catch (error: any) {
              const errorMessage = error.response?.data?.message || 'Failed to activate user';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  }, [loadUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  // ✅ FIX: Open edit modal with the user data
  const handleEditUser = useCallback((user: User) => {
    console.log('Opening edit modal for user:', user);
    setEditingUser(user);
    setShowAddModal(true);
    setShowMenuFor(null);
  }, []);

  // ✅ FIX: Close modal and clear editing user
  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setEditingUser(null);
  }, []);

  // ✅ FIX: Handle modal success
  const handleModalSuccess = useCallback(() => {
    setShowAddModal(false);
    setEditingUser(null);
    loadUsers();
  }, [loadUsers]);

  const getInitials = useCallback((name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  }, []);

  const getRoleColor = useCallback((role: string) => {
    return role === 'owner' ? '#8b5cf6' : '#3b82f6';
  }, []);

  const getRoleLabel = useCallback((role: string) => {
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff';
  }, []);

  const renderUserCard = useCallback(({ item }: { item: User }) => {
    const isActive = item.is_active === true;
    const isMenuOpen = showMenuFor === item.id;
    const displayName = item.full_name || item.username || 'Unknown User';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userUsername}>@{item.username || 'unknown'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: isActive ? '#d1fae5' : '#fee2e2' }]}>
              <Text style={[styles.statusText, { color: isActive ? '#065f46' : '#991b1b' }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowMenuFor(isMenuOpen ? null : item.id)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {isMenuOpen && (
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleEditUser(item)}
            >
              <Ionicons name="pencil-outline" size={18} color="#3b82f6" />
              <Text style={styles.menuText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setResetUser(item);
                setShowResetModal(true);
                setShowMenuFor(null);
              }}
            >
              <Ionicons name="key-outline" size={18} color="#f59e0b" />
              <Text style={styles.menuText}>Reset Password</Text>
            </TouchableOpacity>
            {isActive ? (
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={() => {
                  setShowMenuFor(null);
                  handleDeactivate(item);
                }}
              >
                <Ionicons name="person-remove-outline" size={18} color="#ef4444" />
                <Text style={[styles.menuText, styles.menuTextDanger]}>Deactivate</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenuFor(null);
                  handleActivate(item);
                }}
              >
                <Ionicons name="person-add-outline" size={18} color="#10b981" />
                <Text style={[styles.menuText, { color: '#10b981' }]}>Activate</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color="#9ca3af" />
            <Text style={styles.detailText}>{item.email || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color="#9ca3af" />
            <Text style={styles.detailText}>{item.phone_number || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="briefcase-outline" size={16} color="#9ca3af" />
            <Text style={styles.detailText}>
              <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                {getRoleLabel(item.role)}
              </Text>
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
            <Text style={styles.detailText}>Joined {formatDate(item.date_joined)}</Text>
          </View>
        </View>
      </View>
    );
  }, [showMenuFor, getInitials, formatDate, getRoleColor, getRoleLabel, handleDeactivate, handleActivate, handleEditUser]);

  const filterChips: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Staff', value: 'staff' },
    { label: 'Owners', value: 'owner' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => {
          setEditingUser(null);
          setShowAddModal(true);
        }}>
          <Ionicons name="add-circle" size={32} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chipContainer}>
        {filterChips.map((chip) => (
          <TouchableOpacity
            key={chip.value}
            style={[
              styles.chip,
              activeFilter === chip.value && styles.chipActive,
            ]}
            onPress={() => handleFilter(chip.value)}
          >
            <Text
              style={[
                styles.chipText,
                activeFilter === chip.value && styles.chipTextActive,
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Users Found"
            message="Try adjusting your search or filters, or add a new user."
          />
        }
      />

      {/* User Form Modal - Add/Edit */}
      <UserFormModal
        visible={showAddModal}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        editingUser={editingUser}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
      />

      <ResetPasswordModal
        visible={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetUser(null);
        }}
        onConfirm={handleResetPassword}
        userName={resetUser?.full_name || resetUser?.username || ''}
      />
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
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  chipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userUsername: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  menuButton: {
    padding: 4,
  },
  cardBody: {
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
  },
  roleText: {
    fontWeight: '500',
  },
  menuContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 6,
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 4,
    paddingTop: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  menuTextDanger: {
    color: '#ef4444',
  },
});