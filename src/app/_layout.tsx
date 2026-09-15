import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { DatabaseProvider } from '@/contexts/database-context';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Карта меток' }} />
          <Stack.Screen name="marker/[id]" options={{ title: 'Метка' }} />
        </Stack>
      </DatabaseProvider>
    </ThemeProvider>
  );
}
