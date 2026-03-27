import { View, FlatList, Text, Button } from "react-native";
import { useEffect, useState } from "react";
import api from "../src/services/api";
import { useRouter } from "expo-router";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const router = useRouter();

  const fetchJobs = async () => {
    const res = await api.get("/jobs/?status=pending");
    setJobs(res.data);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const startJob = async (id: number) => {
    await api.patch(`/jobs/${id}/start/`);
    fetchJobs();
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Button title="New Job" onPress={() => router.push("/(tabs)/create-job")} />

      <FlatList
        data={jobs}
        keyExtractor={(item: any) => item.id.toString()}
        renderItem={({ item }: any) => (
          <View style={{ padding: 15, margin: 10, backgroundColor: "#eee" }}>
            <Text>{item.plate_number}</Text>
            <Text>{item.service_name}</Text>

            <Button title="Start" onPress={() => startJob(item.id)} />
          </View>
        )}
      />
    </View>
  );
}