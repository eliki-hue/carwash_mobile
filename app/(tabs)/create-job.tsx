import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from "react-native";
import { useState, useEffect } from "react";
import api from "../../src/services/api";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function CreateJob() {
  const [plate, setPlate] = useState("");
  const [services, setServices] = useState([]); // Ensure it starts as empty array
  const [selectedService, setSelectedService] = useState(null);
  const [carType, setCarType] = useState("SUV");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  const carTypes = ["SUV", "Sedan", "Hatchback", "Truck", "Van"];

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/services/");
      
      // Handle different response formats
      let servicesData = [];
      if (Array.isArray(res.data)) {
        servicesData = res.data;
      } else if (res.data && Array.isArray(res.data.results)) {
        servicesData = res.data.results;
      } else if (res.data && typeof res.data === 'object') {
        // If it's a single object, wrap it in an array
        servicesData = [res.data];
      }
      
      setServices(servicesData);
    } catch (error) {
      console.error("Error fetching services:", error);
      Alert.alert("Error", "Failed to load services. Please try again.");
      setServices([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const createJob = async () => {
    if (!plate.trim()) {
      Alert.alert("Validation Error", "Please enter plate number");
      return;
    }
    if (!selectedService) {
      Alert.alert("Validation Error", "Please select a service");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/jobs/", {
        plate_number: plate.toUpperCase(),
        service: selectedService,
        car_type: carType,
      });
      
      Alert.alert("Success", "Job created successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Error creating job:", error);
      Alert.alert("Error", "Failed to create job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Safe check for services array
  const hasServices = Array.isArray(services) && services.length > 0;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
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
              <Ionicons name="car-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., ABC-1234"
                placeholderTextColor="#999"
                value={plate}
                onChangeText={setPlate}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {plate.length > 0 && (
                <TouchableOpacity onPress={() => setPlate("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Car Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Car Type</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.carTypeScroll}
            >
              {carTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.carTypeButton,
                    carType === type && styles.carTypeButtonActive
                  ]}
                  onPress={() => setCarType(type)}
                >
                  <Text style={[
                    styles.carTypeText,
                    carType === type && styles.carTypeTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Service Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Select Service <Text style={styles.required}>*</Text>
            </Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading services...</Text>
              </View>
            ) : !hasServices ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="construct-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No services available</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={fetchServices}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.servicesGrid}>
                {services.map((item) => (
                  <TouchableOpacity
                    key={item.id || item._id || Math.random().toString()}
                    style={[
                      styles.serviceCard,
                      selectedService === (item.id || item._id) && styles.serviceCardActive
                    ]}
                    onPress={() => setSelectedService(item.id || item._id)}
                  >
                    <Ionicons 
                      name={selectedService === (item.id || item._id) ? "checkmark-circle" : "circle-outline"} 
                      size={24} 
                      color={selectedService === (item.id || item._id) ? "#6366f1" : "#ccc"}
                    />
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{item.name || "Service"}</Text>
                      {item.price && (
                        <Text style={styles.servicePrice}>
                          ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                        </Text>
                      )}
                      {item.duration && (
                        <Text style={styles.serviceDuration}>
                          ⏱️ {item.duration} min
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Summary Section */}
          {selectedService && plate && hasServices && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Job Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Plate Number:</Text>
                <Text style={styles.summaryValue}>{plate.toUpperCase()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Car Type:</Text>
                <Text style={styles.summaryValue}>{carType}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service:</Text>
                <Text style={styles.summaryValue}>
                  {services.find(s => (s.id || s._id) === selectedService)?.name || "Selected"}
                </Text>
              </View>
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.createButton, (!plate || !selectedService) && styles.createButtonDisabled]}
            onPress={createJob}
            disabled={!plate || !selectedService || submitting}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
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
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    paddingVertical: 12,
  },
  carTypeScroll: {
    flexDirection: "row",
  },
  carTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 10,
  },
  carTypeButtonActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  carTypeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  carTypeTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: "#999",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyText: {
    marginTop: 12,
    color: "#999",
    fontSize: 14,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#6366f1",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  servicesGrid: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  serviceCardActive: {
    borderColor: "#6366f1",
    backgroundColor: "#f5f3ff",
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "500",
  },
  serviceDuration: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  createButtonDisabled: {
    backgroundColor: "#c7d2fe",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});