import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Href } from 'expo-router';


export default function StaffDetails() {
  const router = useRouter();

  return (
     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      );
}