import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import api from "../../src/services/api";

export default function Dashboard() {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const res = await api.get("/reports/daily/");
    setData(res.data);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Revenue: {data.total_revenue}</Text>
      <Text>Cars: {data.total_cars}</Text>
    </View>
  );
}