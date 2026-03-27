import { View, TextInput, Button } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../src/services/api";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await api.post("/auth/login/", {
      username,
      password,
    });

    await AsyncStorage.setItem("token", res.data.access);

    api.defaults.headers.Authorization = `Bearer ${res.data.access}`;

    router.replace("/(tabs)/jobs");
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="Username" onChangeText={setUsername} />
      <TextInput placeholder="Password" secureTextEntry onChangeText={setPassword} />
      <Button title="Login" onPress={login} />
    </View>
  );
}