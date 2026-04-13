import { Stack } from 'expo-router';

export default function StaffDetailsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="staff-vehicles" />
      <Stack.Screen name="staff-services" />
    </Stack>
  );
}