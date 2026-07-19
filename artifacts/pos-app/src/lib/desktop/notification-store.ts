import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Notification, NotificationState, NotificationAction } from "./types";

let _state: NotificationState = { notifications: [], unreadCount: 0 };
let _listeners: (() => void)[] = [];

function reducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case "ADD_NOTIFICATION": {
      const n: Notification = {
        ...action.notification,
        id: action.notification.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        read: false,
        pinned: false,
        archived: false,
        timestamp: action.notification.timestamp || Date.now(),
      };
      const notifications = [n, ...state.notifications];
      return {
        notifications,
        unreadCount: notifications.filter((x) => !x.read && !x.archived).length,
      };
    }
    case "MARK_READ": {
      const notifications = state.notifications.map((n) =>
        n.id === action.notificationId ? { ...n, read: true } : n
      );
      return { notifications, unreadCount: notifications.filter((x) => !x.read && !x.archived).length };
    }
    case "MARK_ALL_READ": {
      const notifications = state.notifications.map((n) => ({ ...n, read: true }));
      return { notifications, unreadCount: 0 };
    }
    case "PIN_NOTIFICATION": {
      const notifications = state.notifications.map((n) =>
        n.id === action.notificationId ? { ...n, pinned: true } : n
      );
      return { ...state, notifications };
    }
    case "UNPIN_NOTIFICATION": {
      const notifications = state.notifications.map((n) =>
        n.id === action.notificationId ? { ...n, pinned: false } : n
      );
      return { ...state, notifications };
    }
    case "ARCHIVE_NOTIFICATION": {
      const notifications = state.notifications.map((n) =>
        n.id === action.notificationId ? { ...n, archived: true } : n
      );
      return { notifications, unreadCount: notifications.filter((x) => !x.read && !x.archived).length };
    }
    case "DELETE_NOTIFICATION": {
      const notifications = state.notifications.filter((n) => n.id !== action.notificationId);
      return { notifications, unreadCount: notifications.filter((x) => !x.read && !x.archived).length };
    }
    case "CLEAR_ALL":
      return { notifications: [], unreadCount: 0 };
    default:
      return state;
  }
}

function dispatch(action: NotificationAction) {
  _state = reducer(_state, action);
  _listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter((l) => l !== listener); };
}

function getState(): NotificationState {
  return _state;
}

export function useNotificationStore() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(_state);
  stateRef.current = _state;

  useEffect(() => {
    return subscribe(() => {
      stateRef.current = getState();
      forceUpdate();
    });
  }, []);

  const addNotification = useCallback(
    (notif: Omit<Notification, "id" | "read" | "pinned" | "archived" | "timestamp">) => {
      dispatch({ type: "ADD_NOTIFICATION", notification: notif });
    },
    []
  );

  const markRead = useCallback((id: string) => dispatch({ type: "MARK_READ", notificationId: id }), []);
  const markAllRead = useCallback(() => dispatch({ type: "MARK_ALL_READ" }), []);
  const pinNotification = useCallback((id: string) => dispatch({ type: "PIN_NOTIFICATION", notificationId: id }), []);
  const unpinNotification = useCallback((id: string) => dispatch({ type: "UNPIN_NOTIFICATION", notificationId: id }), []);
  const archiveNotification = useCallback((id: string) => dispatch({ type: "ARCHIVE_NOTIFICATION", notificationId: id }), []);
  const deleteNotification = useCallback((id: string) => dispatch({ type: "DELETE_NOTIFICATION", notificationId: id }), []);
  const clearAll = useCallback(() => dispatch({ type: "CLEAR_ALL" }), []);

  return {
    state: stateRef.current,
    addNotification,
    markRead,
    markAllRead,
    pinNotification,
    unpinNotification,
    archiveNotification,
    deleteNotification,
    clearAll,
  };
}
