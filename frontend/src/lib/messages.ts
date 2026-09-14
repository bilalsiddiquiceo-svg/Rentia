import { apiFetch } from './api';

// ── Types ─────────────────────────────────────────────────────

export interface MessageParticipant {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
}

export interface ConversationProperty {
  id: string;
  title: string;
  photo: string | null;
  status: string;
  city: string;
  neighborhood?: string | null;
  neighborhoodDescription?: string | null;
  address?: string;
  monthlyRent: number;
}

export interface Message {
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

export interface InboxLastMessage {
  senderId: string;
  text: string | null;
  createdAt: string;
}

export interface ConversationListItem {
  id: string;
  property: {
    id: string;
    title: string;
    status: string;
  };
  otherUser: MessageParticipant;
  lastMessage: InboxLastMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  propertyId: string;
  property: ConversationProperty;
  otherUser: MessageParticipant;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMessages {
  items: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}

// ── API calls ─────────────────────────────────────────────────

export async function getOrCreateConversation(
  propertyId: string,
): Promise<ConversationDetail> {
  return apiFetch<ConversationDetail>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ propertyId }),
  });
}

export const getConversations = (() => {
  let inflight: Promise<ConversationListItem[]> | null = null;
  return (): Promise<ConversationListItem[]> => {
    if (!inflight) {
      inflight = apiFetch<ConversationListItem[]>('/conversations').finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };
})();

export async function getConversation(
  id: string,
): Promise<ConversationDetail> {
  return apiFetch<ConversationDetail>(`/conversations/${id}`);
}

export async function getMessages(
  id: string,
  params?: { before?: string; limit?: number },
): Promise<PaginatedMessages> {
  const qs = new URLSearchParams();
  if (params?.before) qs.set('before', params.before);
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<PaginatedMessages>(
    `/conversations/${id}/messages${query ? `?${query}` : ''}`,
  );
}

export async function sendMessage(
  id: string,
  payload: { text?: string; attachmentUrls?: string[] },
): Promise<Message> {
  return apiFetch<Message>(`/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  text: string,
): Promise<Message> {
  return apiFetch<Message>(
    `/conversations/${conversationId}/messages/${messageId}`,
    { method: 'PATCH', body: JSON.stringify({ text }) },
  );
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<{ ok: boolean }> {
  return apiFetch(`/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
  });
}

export async function markConversationRead(
  id: string,
): Promise<{ ok: boolean; readAt: string }> {
  return apiFetch(`/conversations/${id}/read`, { method: 'POST' });
}

export async function presignChatUpload(
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; path: string; publicUrl: string }> {
  return apiFetch('/conversations/upload', {
    method: 'POST',
    body: JSON.stringify({ fileName, contentType }),
  });
}
