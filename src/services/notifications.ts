import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Marker } from '@/types';
import { formatDistance } from '@/utils/format';

/** Радиус срабатывания уведомления, м. */
export const PROXIMITY_THRESHOLD = 100;
/** Выход из зоны считается по большему радиусу, чтобы уведомление не мигало на границе. */
export const PROXIMITY_EXIT_THRESHOLD = 140;

const ANDROID_CHANNEL_ID = 'proximity';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ActiveNotification {
  markerId: number;
  notificationId: string;
  timestamp: number;
}

export async function requestNotificationPermissions(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Метки рядом',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  if (!requested.granted) {
    throw new Error('Уведомления отключены. Разрешите их в настройках, чтобы получать подсказки о метках.');
  }
}

/**
 * Держит в памяти уведомления по меткам: одно уведомление на метку, повторных не будет,
 * пока пользователь не выйдет из зоны.
 */
export class NotificationManager {
  private activeNotifications = new Map<number, ActiveNotification>();
  private inFlight = new Set<number>();

  isActive(markerId: number): boolean {
    return this.activeNotifications.has(markerId) || this.inFlight.has(markerId);
  }

  getActiveMarkerIds(): number[] {
    return [...this.activeNotifications.keys()];
  }

  async showNotification(marker: Marker, distance: number): Promise<void> {
    if (this.isActive(marker.id)) {
      return;
    }
    this.inFlight.add(marker.id);
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Вы рядом с меткой!',
          body: `Метка №${marker.id} в ${formatDistance(distance)} от вас.`,
          data: { markerId: marker.id },
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null),
        },
        trigger: null,
      });
      this.activeNotifications.set(marker.id, {
        markerId: marker.id,
        notificationId,
        timestamp: Date.now(),
      });
    } finally {
      this.inFlight.delete(marker.id);
    }
  }

  async removeNotification(markerId: number): Promise<void> {
    const notification = this.activeNotifications.get(markerId);
    if (!notification) {
      return;
    }
    this.activeNotifications.delete(markerId);
    // Уведомление уже показано, поэтому его нужно убрать из шторки, а не отменить расписание.
    await Notifications.dismissNotificationAsync(notification.notificationId);
    await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
  }

  /** Снимает уведомления меток, которых больше нет в базе. */
  async syncWithMarkers(existingIds: Set<number>): Promise<void> {
    const stale = this.getActiveMarkerIds().filter((id) => !existingIds.has(id));
    await Promise.all(stale.map((id) => this.removeNotification(id)));
  }

  async reset(): Promise<void> {
    await Promise.all(this.getActiveMarkerIds().map((id) => this.removeNotification(id)));
  }
}
