import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { API } from '@/config';
import { ACCESS_TOKEN_KEY, getStoredToken } from '@/utils/tokenStorage';

export function useRealtimeNotifications(enabled = true) {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    if (!enabled) return;
    try {
      const { data } = await axios.get(`${API}/locality/notifications/mine`, { params: { limit: 100 } });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    loadNotifications();
    const token = getStoredToken(ACCESS_TOKEN_KEY);
    if (!token) return undefined;

    const url = `${API.replace(/\/api$/, '')}/api/locality/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener('notification', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        setNotifications((prev) => [
          {
            notification_id: payload.notification_id,
            kind: payload.kind,
            title: payload.title,
            body: payload.body,
            payload: payload.payload || {},
            created_at: payload.created_at,
            is_read: false,
          },
          ...prev,
        ]);
      } catch {
        // ignore malformed payload
      }
    });
    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [enabled, loadNotifications]);

  const markRead = useCallback(async (notificationId) => {
    try {
      const { data } = await axios.post(`${API}/locality/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notificationId ? { ...n, ...data } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  }, []);

  return { notifications, unreadCount, connected, loadNotifications, markRead };
}
