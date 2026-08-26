import { type ElementPlugin, PluginType } from '@deephaven/plugin';
import {
  NOTIFICATION_EVENT,
  showNotification,
  type NotificationParams,
} from './Notification';

// The host's ElementPlugin type does not declare eventMapping yet.
type ElementPluginWithEvents = ElementPlugin & {
  eventMapping: Record<string, (params: Record<string, unknown>) => void>;
};

export const DeephavenPluginNotificationPlugin: ElementPluginWithEvents = {
  name: 'deephaven-plugin-notification',
  type: PluginType.ELEMENT_PLUGIN,
  // Notifications are triggered by events, so this plugin renders no elements.
  mapping: {},
  eventMapping: {
    [NOTIFICATION_EVENT]: (params: Record<string, unknown>) => {
      showNotification(params as unknown as NotificationParams);
    },
  },
};

export default DeephavenPluginNotificationPlugin;
