'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRealtime, type RealtimeMessage } from '@/context/realtime-context';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationRead,
  presignChatUpload,
} from '@/lib/messages';
import { MessageBubble } from '@/components/MessageBubble';
import { TypingIndicator } from '@/components/TypingIndicator';

interface ChatWindowProps {
  conversationId: string;
  otherUser: { id: string; name?: string | null; email: string };
}

export function ChatWindow({ conversationId, otherUser }: ChatWindowProps) {
  const { user } = useAuth();
  const { socket, setActiveConversation } = useRealtime();
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const myId = user?.id;

  // Set active conversation for toast suppression
  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  // Load initial messages
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setHasMore(true);

    getMessages(conversationId, { limit: 20 })
      .then((res) => {
        if (cancelled) return;
        setMessages(res.items);
        setHasMore(res.hasMore);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [conversationId]);

  // Scroll to bottom on new messages (only if near bottom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Scroll to bottom on initial load — retries until the last message is in view
  // so image loads / layout shifts never leave the chat off-by-a-few-messages.
  const initialScrolledRef = useRef(false);
  useEffect(() => {
    initialScrolledRef.current = false;
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container || initialScrolledRef.current) return;
    const isSettled = container.scrollHeight > container.clientHeight;
    const lastMsg = container.lastElementChild as HTMLElement | null;
    if (!lastMsg || !isSettled) return;
    container.scrollTop = container.scrollHeight;
    initialScrolledRef.current = true;
  }, []);

  useEffect(() => {
    if (loading) return;
    requestAnimationFrame(scrollToBottom);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    if (loading) return;
    requestAnimationFrame(scrollToBottom);
  }, [messages, loading, scrollToBottom]);

  // Mark as read on mount only (not on every message — that was firing a REST call per message)
  useEffect(() => {
    markConversationRead(conversationId).catch(() => {});
    socket?.emit('message:read', { conversationId });
  }, [conversationId, socket]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { conversationId: string; message: RealtimeMessage }) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      socket.emit('message:read', { conversationId });
    };

    const handleUpdatedMessage = (data: { conversationId: string; message: RealtimeMessage }) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) => prev.map((m) => m.id === data.message.id ? data.message : m));
    };

    const handleDeletedMessage = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, deletedAt: new Date().toISOString(), text: null }
            : m,
        ),
      );
    };

    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId !== conversationId || data.userId === myId) return;
      setPeerTyping(data.isTyping);
      if (data.isTyping) {
        clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 3000);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('typing', handleTyping);

    const handleReadReceipt = (data: { conversationId: string; readAt: string }) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === myId && !m.readAt ? { ...m, readAt: data.readAt } : m,
        ),
      );
    };
    socket.on('read', handleReadReceipt);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleUpdatedMessage);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('typing', handleTyping);
      socket.off('read', handleReadReceipt);
      clearTimeout(peerTypingTimeoutRef.current);
    };
  }, [socket, conversationId, myId]);

  // Typing emission
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      socket?.emit('typing', { conversationId, isTyping });
    },
    [socket, conversationId],
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!typing) {
      setTyping(true);
      emitTyping(true);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      emitTyping(false);
    }, 1500);
  };

  // Send text message
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText('');
    setTyping(false);
    emitTyping(false);
    clearTimeout(typingTimeoutRef.current);

    try {
      const sent = await sendMessage(conversationId, { text: trimmed });
      if (sent) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
      }
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // Load older messages — preserves the user's scroll position so the view
  // stays on the same messages instead of jumping to the newest loaded one.
  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const container = containerRef.current;
    const prevScrollTop = container?.scrollTop ?? 0;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    try {
      const oldest = messages[0].createdAt;
      const res = await getMessages(conversationId, { before: oldest, limit: 20 });
      if (res.items.length > 0) {
        setMessages((prev) => [...res.items.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
        if (container) {
          requestAnimationFrame(() => {
            container.scrollTop =
              prevScrollTop + (container.scrollHeight - prevScrollHeight);
          });
        }
      }
      setHasMore(res.hasMore);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  // Scroll event for loading older messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = () => {
      if (container.scrollTop < 80) loadMore();
    };
    container.addEventListener('scroll', handler, { passive: true });
    return () => container.removeEventListener('scroll', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, messages.length]);

  // Image upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await presignChatUpload(file.name, file.type);
      const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!res.ok) throw new Error('Upload failed');
      await sendMessage(conversationId, { attachmentUrls: [publicUrl] });
    } catch {
      // Could show toast here
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Edit handler
  const handleEdit = async (messageId: string, newText: string) => {
    try {
      await editMessage(conversationId, messageId, newText);
    } catch {
      // Could show toast
    }
  };

  // Delete handler
  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(conversationId, messageId);
    } catch {
      // Could show toast
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container flex h-full flex-col">
      {/* Chat header */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 bg-white/80 px-5 backdrop-blur-xl">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#2DD4BF] text-[12px] font-semibold text-white">
          {otherUser.name?.charAt(0)?.toUpperCase() ?? otherUser.email.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-800">
            {otherUser.name ?? otherUser.email.split('@')[0]}
          </p>
          {peerTyping && (
            <p className="text-[11px] text-[#0F766E] animate-pulse">typing…</p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={containerRef}
        className="chat-messages flex-1 overflow-y-auto overflow-x-hidden px-5 py-4"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F766E]" />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="py-4 text-center">
                {loadingMore ? (
                  <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#0F766E]" />
                ) : (
                  <button
                    onClick={loadMore}
                    className="text-[11px] font-medium text-slate-400 hover:text-[#0F766E]"
                  >
                    Load older messages
                  </button>
                )}
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === myId}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
            {peerTyping && <TypingIndicator name={otherUser.name ?? otherUser.email.split('@')[0]} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors focus-within:border-[#0F766E]/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0F766E]/10">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            title="Attach image"
          >
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#0F766E]" />
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
              </svg>
            )}
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none border-none bg-transparent py-1.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            style={{ maxHeight: '120px', minHeight: '24px' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#0D9488] text-white shadow-sm transition-all hover:shadow-md hover:shadow-[#0F766E]/20 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
