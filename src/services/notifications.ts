import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { createLogger } from '@/logger';
import type { Marker } from '@/types';
import { formatDistance } from '@/utils/format';

type NotificationsModule = typeof import('expo-notifications');

const ANDROID_CHANNEL_ID = 'proximity';

const logNotify = createLogger('notify');

export const NOTIFICATIONS_UNAVAILABLE =
  'Уведомления недоступны в Expo Go на Android. Соберите development build, чтобы их получать.';

/**
 * В Expo Go на Android сам импорт `expo-notifications` бросает исключение: модуль
 * DevicePushTokenAutoRegistration регистрирует слушателя push-токена прямо при загрузке.
 * Поэтому модуль подгружается лениво и только там, где он поддерживается.
 */
export function areNotificationsSupported(): boolean {
  return !(Platform.OS === 'android' && isRunningInExpoGo());
}

let notifications: NotificationsModule | null = null;

function loadNotifications(): NotificationsModule {
  if (!areNotificationsSupported()) {
    logNotify('недоступны', NOTIFICATIONS_UNAVAILABLE);
    throw new Error(NOTIFICATIONS_UNAVAILABLE);
  }
  if (!notifications) {
    const module = require('expo-notifications') as NotificationsModule;
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notifications = module;
    logNotify('модуль expo-notifications загружен');
  }
  return notifications;
}

export interface ActiveNotification {
  markerId: number;
  notificationId: string;
  timestamp: number;
}

export async function requestNotificationPermissions(): Promise<void> {
  const Notifications = loadNotifications();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Метки рядом',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    logNotify('разрешение уже выдано');
    return;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  logNotify('разрешение запрошено', requested.granted ? 'выдано' : 'отклонено');
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
    const Notifications = loadNotifications();

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
      logNotify('показано', `метка №${marker.id}`, formatDistance(distance));
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
    logNotify('снято', `метка №${markerId}`);

    const Notifications = loadNotifications();
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
