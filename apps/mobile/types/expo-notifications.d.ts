declare module "expo-notifications" {
  export type PermissionStatus = "granted" | "denied" | "undetermined";
  export interface PermissionResponse { status: PermissionStatus; }
  export interface ExpoPushToken { data: string; type: "expo"; }
  export interface Notification { request: { content: { title?: string; body?: string; data?: Record<string, unknown> } } }
  export interface NotificationHandler {
    handleNotification: (n: Notification) => Promise<{ shouldShowAlert: boolean; shouldPlaySound: boolean; shouldSetBadge: boolean }>;
  }
  export interface EventSubscription { remove(): void; }

  export function setNotificationHandler(handler: NotificationHandler): void;
  export function getPermissionsAsync(): Promise<PermissionResponse>;
  export function requestPermissionsAsync(): Promise<PermissionResponse>;
  export function getExpoPushTokenAsync(options?: { projectId?: string }): Promise<ExpoPushToken>;
  export function addNotificationReceivedListener(listener: (n: Notification) => void): EventSubscription;
  export function removeNotificationSubscription(subscription: EventSubscription): void;
  export function scheduleNotificationAsync(request: {
    content: { title: string; body?: string; data?: Record<string, unknown> };
    trigger: null | { seconds: number };
  }): Promise<string>;
}
