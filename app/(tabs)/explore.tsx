import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import api from "../../src/services/api";

export default function Explore() {
  const [data, setData] = useState({
    total_revenue: 0,
    total_cars: 0,
  });

  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/reports/daily/");
      setData(res.data);
    } catch (error) {
      console.log("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    fetchData();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Business Insights</Text>

      {/* Revenue Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Total Revenue</Text>
        <Text style={styles.value}>KES {data.total_revenue || 0}</Text>
      </View>

      {/* Cars Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Cars Washed</Text>
        <Text style={styles.value}>{data.total_cars || 0}</Text>
      </View>

      {/* Future expansion */}
      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.subtext}>
          System running normally ✅
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },

  label: {
    fontSize: 14,
    color: "#777",
  },

  value: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
  },

  subtext: {
    fontSize: 14,
    marginTop: 5,
  },
});