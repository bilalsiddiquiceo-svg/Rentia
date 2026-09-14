'use client';

import React, { useState } from 'react';
import type { RealtimeMessage } from '@/context/realtime-context';

interface MessageBubbleProps {
  message: RealtimeMessage;
  isOwn: boolean;
  onEdit?: (messageId: string, text: string) => void;
  onDelete?: (messageId: string) => void;
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function MessageBubble({ message, isOwn, onEdit, onDelete }: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text ?? '');

  const isDeleted = !!message.deletedAt;
  const isEdited = !!message.editedAt;
  const isRead = !!message.readAt && isOwn;

  const canAct = isOwn && !isDeleted;
  const withinEditWindow =
    isOwn &&
    !isDeleted &&
    Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000;

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== message.text) {
      onEdit?.(message.id, trimmed);
    }
    setEditing(false);
  };

  if (isDeleted) {
    return (
      <div className={`message-bubble-in flex justify-${isOwn ? 'end' : 'start'} py-1`}>
        <div className={`px-4 py-2 text-[13px] italic text-slate-400 ${isOwn ? 'bg-slate-50 rounded-2xl rounded-br-sm border border-slate-100' : ''}`}>
          Message deleted
        </div>
      </div>
    );
  }

  return (
    <div className={`message-bubble-in flex ${isOwn ? 'justify-end' : 'justify-start'} py-1 group`}>
      <div className="relative max-w-[75%]">
        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className={`mb-1 flex flex-wrap gap-2 ${isOwn ? 'justify-end' : ''}`}>
            {message.attachments.map((url, i) => (
              <img
                key={i}
                src={url}
                alt="Attachment"
                className="max-h-[240px] max-w-full rounded-2xl object-cover shadow-sm"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Text bubble */}
        {(message.text || editing) ? (
        editing ? (
          <div className="rounded-2xl border border-[#0F766E]/30 bg-white p-3 shadow-md">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-full resize-none border-none bg-transparent text-[14px] text-slate-800 outline-none"
              rows={2}
              autoFocus
            />
            <div className="mt-1.5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-3 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-lg bg-[#0F766E] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#0D9488]"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`px-4 py-2.5 ${
              isOwn
                ? 'rounded-2xl rounded-br-sm bg-gradient-to-br from-[#0F766E] to-[#0D9488] text-white shadow-md shadow-[#0F766E]/15'
                : 'rounded-2xl rounded-bl-sm border border-slate-100 bg-white text-slate-800 shadow-sm'
            }`}
          >
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
          </div>
          )
        ) : null}

        {/* Meta row */}
        <div className={`mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 ${isOwn ? 'justify-end' : ''}`}>
          <span>{formatTime(message.createdAt)}</span>
          {isEdited && <span className="italic">(edited)</span>}
          {isOwn && (
            <span className="flex items-center">
              {isRead ? (
                <svg className="h-3.5 w-3.5 text-[#0F766E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l4 4L14 6M8 12l4 4L22 6" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          )}
        </div>

        {/* Hover actions (own messages) */}
        {canAct && withinEditWindow && !editing && (
          <div className="absolute -top-2 right-0 hidden group-hover:flex gap-1 rounded-lg border border-slate-100 bg-white p-1 shadow-lg">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl">
                <button
                  onClick={() => { setEditing(true); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-[12px] text-slate-600 hover:bg-slate-50"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => { onDelete?.(message.id); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-[12px] text-red-500 hover:bg-red-50"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
