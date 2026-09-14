'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useRealtime } from '@/context/realtime-context';
import {
  getConversations,
  type ConversationListItem,
} from '@/lib/messages';
import { ConversationList } from '@/components/ConversationList';
import { PageHeading } from '@/components/PageHeading';

export default function MessagesPage() {
  const { user } = useAuth();
  const { socket } = useRealtime();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const items = await getConversations();
      setConversations(items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Listen for new messages to update inbox
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: {
      conversationId: string;
      message: { id: string; text: string | null; senderId: string; createdAt: string; attachments: string[] };
      senderName?: string;
    }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === data.conversationId);
        const incoming = {
          id: data.message.id,
          conversationId: data.conversationId,
          senderId: data.message.senderId,
          text: data.message.text,
          attachments: data.message.attachments,
          editedAt: null,
          deletedAt: null,
          readAt: null,
          createdAt: data.message.createdAt,
        };

        if (idx === -1) {
          loadConversations();
          return prev;
        }

        const existing = prev[idx];
        const isFromMe = data.message.senderId === user?.id;

        const updated: ConversationListItem = {
          ...existing,
          lastMessage: incoming,
          unreadCount: isFromMe ? existing.unreadCount : existing.unreadCount + 1,
          updatedAt: new Date().toISOString(),
        };

        const next = [...prev];
        next.splice(idx, 1);
        return [updated, ...next];
      });
    };

    const handleRead = (data: { conversationId: string; readAt: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('read', handleRead);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('read', handleRead);
    };
  }, [socket, user?.id, loadConversations]);

  const unreadTotal = conversations.reduce((n, c) => n + c.unreadCount, 0);

  return (
    <div className="messages-inbox h-full">
      <div className="mx-auto h-full w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <PageHeading
          title="Messages"
          subtitle={
            loading
              ? 'Loading your inbox…'
              : conversations.length === 0
                ? 'Your conversations will appear here'
                : `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}${unreadTotal > 0 ? ` · ${unreadTotal} unread` : ''}`
          }
        />

        <div className="flex h-[calc(100%-7rem)] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 ring-1 ring-black/[0.02]">
          <ConversationList
            conversations={conversations}
            currentUserId={user?.id ?? ''}
            loading={loading}
            onSelect={(id) => router.push(`/app/messages/${id}`)}
          />
        </div>
      </div>
    </div>
  );
}
