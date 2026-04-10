import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function TabsLayout() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const loadRole = async () => {
      const storedRole = await AsyncStorage.getItem("role");
      setRole(storedRole);
    };

    loadRole();
  }, []);

  if (!role) return null;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {/* COMMON */}
      <Tabs.Screen name="jobs" options={{ title: "Jobs" }} />

      {/* OWNER ONLY */}
      {role === "owner" && (
        <Tabs.Screen name="dashboard" options={{ title: "Finance" }} />
      )}

      {role === "owner" && (
        <Tabs.Screen name="users" options={{ title: "Users" }} />
      )}

      {role === "owner" && (
        <Tabs.Screen name="services" options={{ title: "Services" }} />
      )}
    </Tabs>
  );
}