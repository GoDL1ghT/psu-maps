import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinate, Marker } from '@/types';

type MarkersMapProps = {
  markers: Marker[];
  onAddMarker: (coordinate: Coordinate) => void;
  onSelectMarker: (marker: Marker) => void;
};

export function MarkersMap(_props: MarkersMapProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="subtitle">Карта доступна на устройстве</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        Откройте проект в Expo Go на Android или iOS — веб-версия карту не поддерживает.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  text: {
    textAlign: 'center',
    maxWidth: 420,
  },
});
