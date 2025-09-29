'use client';

import { v4 as uuidv4 } from 'uuid';

// If you don't have uuid installed, you can swap to a lightweight helper:
// const uuidv4 = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export type Sender = 'user' | 'ai';

export type Message = {
  id: number | string;
  sender: Sender;
  content: string;
  mermaidChart?: string;
  timestamp: Date | string | number;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export const CHATS_KEY = 'tayyari.chats.v1';
export const ACTIVE_CHAT_KEY = 'tayyari.activeChatId';

export function loadChats(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    // revive timestamps into numbers and messages timestamps into Date-compatible values
    return parsed.map(c => ({
      ...c,
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
      updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
      messages: (c.messages || []).map(m => ({
        ...m,
        timestamp: m.timestamp ?? Date.now(),
      })),
    }));
  } catch {
    return [];
  }
}

export function saveChats(chats: ChatSession[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {
    // ignore
  }
}

export function getActiveChatId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_CHAT_KEY);
}
export function setActiveChatId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_CHAT_KEY, id);
}

export function newChatSession(): ChatSession {
  return {
    id: uuidv4(),
    title: 'New chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
}

export function deriveTitleFromMessage(text: string, maxLen = 60): string {
  const firstLine = (text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .split(/\r?\n/).find(l => l.trim().length > 0) || 'New chat';

  const clean = firstLine.trim().replace(/\s+/g, ' ');
  return clean.length > maxLen ? clean.slice(0, maxLen).trimEnd() + '…' : clean;
}

export function upsertChat(
  chats: ChatSession[],
  chat: ChatSession
): ChatSession[] {
  const idx = chats.findIndex(c => c.id === chat.id);
  if (idx === -1) return [chat, ...chats];
  const copy = [...chats];
  copy[idx] = chat;
  // Keep list sorted by updatedAt desc
  return copy.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteChat(chats: ChatSession[], chatId: string): ChatSession[] {
  const filtered = chats.filter(c => c.id !== chatId);
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}