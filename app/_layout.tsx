import 'react-native-reanimated'
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../constants';
import { useSession } from '../hooks';

export default function RootLayout() {
  const { session, loading } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Sin sesión y fuera del grupo auth → redirigir a bienvenida
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      // Con sesión y dentro del grupo auth → redirigir al home
      router.replace('/(app)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
