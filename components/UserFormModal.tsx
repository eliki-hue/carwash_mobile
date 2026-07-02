// src/components/UserFormModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, CreateUserRequest, UpdateUserRequest } from '../src/types/user';

interface UserFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingUser?: User | null;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest, userId?: number) => Promise<void>;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  visible,
  onClose,
  onSuccess,
  editingUser,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    role: 'staff' as 'staff' | 'owner',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username || '',
        first_name: editingUser.first_name || '',
        last_name: editingUser.last_name || '',
        email: editingUser.email || '',
        phone_number: editingUser.phone_number || '',
        password: '',
        role: editingUser.role || 'staff',
        is_active: editingUser.is_active !== undefined ? editingUser.is_active : true,
      });
    } else {
      resetForm();
    }
  }, [editingUser, visible]);

  const resetForm = () => {
    setFormData({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      password: '',
      role: 'staff',
      is_active: true,
    });
  };

  const validate = (): boolean => {
    if (!formData.username.trim()) {
      Alert.alert('Error', 'Username is required');
      return false;
    }
    if (!formData.first_name.trim()) {
      Alert.alert('Error', 'First name is required');
      return false;
    }
    if (!formData.last_name.trim()) {
      Alert.alert('Error', 'Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!editingUser && !formData.password) {
      Alert.alert('Error', 'Password is required for new users');
      return false;
    }
    if (!editingUser && formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const submitData: any = {
        username: formData.username.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        role: formData.role,
      };

      if (editingUser) {
        // Update
        if (formData.password) {
          submitData.password = formData.password;
        }
        submitData.is_active = formData.is_active;
        await onSubmit(submitData, editingUser.id);
      } else {
        // Create
        submitData.password = formData.password;
        await onSubmit(submitData);
      }
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save user';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderRoleOption = (role: 'staff' | 'owner') => (
    <TouchableOpacity
      style={[
        styles.roleOption,
        formData.role === role && styles.roleOptionActive,
      ]}
      onPress={() => setFormData({ ...formData, role })}
    >
      <Text
        style={[
          styles.roleOptionText,
          formData.role === role && styles.roleOptionTextActive,
        ]}
      >
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {editingUser ? 'Edit User' : 'Add User'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor="#9ca3af"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First name"
                  placeholderTextColor="#9ca3af"
                  value={formData.first_name}
                  onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Last name"
                  placeholderTextColor="#9ca3af"
                  value={formData.last_name}
                  onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor="#9ca3af"
                value={formData.phone_number}
                onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                keyboardType="phone-pad"
              />
            </View>

            {!editingUser ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter password (min 6 chars)"
                    placeholderTextColor="#9ca3af"
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>Minimum 6 characters</Text>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password (Optional)</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter new password (optional)"
                    placeholderTextColor="#9ca3af"
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>Leave blank to keep current password</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role *</Text>
              <View style={styles.roleContainer}>
                {renderRoleOption('staff')}
                {renderRoleOption('owner')}
              </View>
            </View>

            {editingUser && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusContainer}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      formData.is_active && styles.statusOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, is_active: true })}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        formData.is_active && styles.statusOptionTextActive,
                      ]}
                    >
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      !formData.is_active && styles.statusOptionActive,
                    ]}
                    onPress={() => setFormData({ ...formData, is_active: false })}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        !formData.is_active && styles.statusOptionTextActive,
                      ]}
                    >
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingUser ? 'Update User' : 'Add User'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  roleOptionTextActive: {
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});