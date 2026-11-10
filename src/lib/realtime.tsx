import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import { useAuth } from './auth';
import { useToast } from './toast';
import type { FundNotification } from '../types';

interface RealtimeContextValue {
  /** Increments after a database change; pages include it in their load effect. */
  version: number;
  notifications: FundNotification[];
  unread: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// The portable API runs on ordinary HTTP functions and has no Realtime channel,
// so the client polls a tiny /sync endpoint instead. Twenty seconds keeps the
// app responsive without loading the free database plan.
const POLL_INTERVAL_MS = 20_000;

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?.id ?? null;
  const [version, setVersion] = useState(0);
  const [notifications, setNotifications] = useState<FundNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const bumpTimer = useRef<number | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const lastEventId = useRef(-1);

  const scheduleVersionBump = useCallback(() => {
    if (bumpTimer.current) window.clearTimeout(bumpTimer.current);
    bumpTimer.current = window.setTimeout(() => {
      bumpTimer.current = null;
      setVersion((value) => value + 1);
    }, 350);
  }, []);

  const loadNotifications = useCallback(
    async (announce: boolean) => {
      if (!userId) {
        setNotifications([]);
        setUnread(0);
        knownIds.current = new Set();
        return;
      }
      setLoading(true);
      try {
        const payload = await api.get<{ notifications: FundNotification[]; unread: number }>(
          '/notifications'
        );
        if (announce) {
          const fresh = payload.notifications.filter((item) => !knownIds.current.has(item.id));
          if (fresh.length && knownIds.current.size) toast.info(fresh[0].title);
        }
        knownIds.current = new Set(payload.notifications.map((item) => item.id));
        setNotifications(payload.notifications);
        setUnread(payload.unread);
      } catch {
        /* A notification failure must never block the main screen. */
      } finally {
        setLoading(false);
      }
    },
    [userId, toast]
  );

  const refreshNotifications = useCallback(
    () => loadNotifications(false),
    [loadNotifications]
  );

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnread(0);
      knownIds.current = new Set();
      lastEventId.current = -1;
      return;
    }

    void loadNotifications(false);

    let stopped = false;
    const tick = async () => {
      try {
        const sync = await api.get<{ latest_event_id: number; unread: number }>('/sync');
        if (stopped) return;
        if (lastEventId.current >= 0 && sync.latest_event_id !== lastEventId.current) {
          scheduleVersionBump();
          if (sync.unread > unread) void loadNotifications(true);
        }
        lastEventId.current = sync.latest_event_id;
      } catch {
        /* Network blips are expected on mobile; the next tick retries. */
      }
    };

    void tick();
    const interval = window.setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [userId, loadNotifications, scheduleVersionBump, unread]);

  useEffect(() => {
    if (!userId) return;
    const refreshOnFocus = () => void refreshNotifications();
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') void refreshNotifications();
    };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisible);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, [userId, refreshNotifications]);

  useEffect(
    () => () => {
      if (bumpTimer.current) window.clearTimeout(bumpTimer.current);
    },
    []
  );

  const markRead = useCallback(
    async (id: string) => {
      const target = notifications.find((item) => item.id === id);
      if (target?.read_at) return;
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read_at: new Date().toISOString() } : item
        )
      );
      setUnread((current) => Math.max(0, current - 1));
      try {
        await api.post(`/notifications/${id}/read`);
      } catch {
        void refreshNotifications();
      }
    },
    [notifications, refreshNotifications]
  );

  const markAllRead = useCallback(async () => {
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      }))
    );
    setUnread(0);
    try {
      await api.post('/notifications/read-all');
    } catch {
      void refreshNotifications();
    }
  }, [refreshNotifications]);

  const value = useMemo(
    () => ({
      version,
      notifications,
      unread,
      loading,
      markRead,
      markAllRead,
      refreshNotifications,
    }),
    [version, notifications, unread, loading, markRead, markAllRead, refreshNotifications]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used inside RealtimeProvider');
  return context;
}

export function useRealtimeVersion() {
  return useRealtime().version;
}
