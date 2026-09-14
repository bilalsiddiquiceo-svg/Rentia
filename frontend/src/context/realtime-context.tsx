'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import { useToast } from '@/components/Toast';
import { getAccessToken } from '@/lib/api';
import { getUnreadNotificationCount } from '@/lib/notifications';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface RealtimeMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string | null;
  attachments: string[];
  editedAt: string | null;
  deletedAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

interface RealtimeContextType {
  socket: Socket | null;
  notificationCount: number;
  refreshNotificationCount: () => Promise<void>;
  setActiveConversation: (id: string | null) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const activeConversationRef = useRef<string | null>(null);
  const toastFnRef = useRef(toast);
  toastFnRef.current = toast;

  const refreshNotificationCount = useCallback(async () => {
    try {
      const { count } = await getUnreadNotificationCount();
      setNotificationCount(count);
    } catch {
      // ignore
    }
  }, []);

  const setActiveConversation = useCallback((id: string | null) => {
    activeConversationRef.current = id;
  }, []);

  // Fetch initial notification unread count whenever a user logs in
  // (socket-independent).
  useEffect(() => {
    if (user) {
      refreshNotificationCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Connect / disconnect socket with user lifecycle
  useEffect(() => {
    if (!user) {
      setSocket((prev) => {
        prev?.disconnect();
        return null;
      });
      setNotificationCount(0);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const s = io(`${API_BASE}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    s.on('connect', () => {
      // Counts already fetched on login; socket events keep them fresh
    });

    s.on('notification:new', (payload: { notification: RealtimeNotification }) => {
      setNotificationCount((c) => c + 1);
      const n = payload.notification;
      if (n.body) {
        toastFnRef.current(n.body, 'info');
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
    // reconnect only on login/logout, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <RealtimeContext.Provider
      value={{
        socket,
        notificationCount,
        refreshNotificationCount,
        setActiveConversation,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
