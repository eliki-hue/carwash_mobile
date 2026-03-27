import { View, TextInput, Button } from "react-native";
import { useState, useEffect } from "react";
import api from "../../src/services/api";
import { useRouter } from "expo-router";

export default function CreateJob() {
  const [plate, setPlate] = useState("");
  const [services, setServices] = useState([]);
  const [service, setService] = useState(null);

  const router = useRouter();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const res = await api.get("/services/");
    setServices(res.data);
  };

  const createJob = async () => {
    await api.post("/jobs/", {
      plate_number: plate,
      service,
      car_type: "SUV",
    });

    router.back();
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="Plate Number" onChangeText={setPlate} />
      <Button title="Create Job" onPress={createJob} />
    </View>
  );
}