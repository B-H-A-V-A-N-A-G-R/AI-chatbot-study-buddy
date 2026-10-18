import { useCallback, useEffect, useState } from 'react';

// Every conversation shown in the sidebar is a "thread". Threads are kept in the browser's
// localStorage, so the sidebar history survives a page refresh.
//
//   thread  = { id, title, serverChatId, updatedAt, messages: [] }
//   message = { id, role: 'user' | 'assistant', kind: 'text' | 'quiz', text, usage?, error?, quiz?, picked?, pending? }
//
// serverChatId is the CONVERSATION ID the Spring backend uses for chat memory. It is created
// lazily the first time you send a message in Chat mode (see App.jsx).
// Note: the backend keeps that memory in RAM, so after a backend restart the saved messages
// still show here, but the tutor no longer remembers them.

const KEY = 'studybuddy.threads.v2';

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    // A page refresh in the middle of a reply must not leave a "thinking" spinner forever.
    return JSON.parse(raw).map((t) => ({
      ...t,
      messages: (t.messages || []).map((m) => ({ ...m, pending: false })),
    }));
  } catch {
    return [];
  }
}

export function useThreads() {
  const [threads, setThreads] = useState(load);

  // Save to localStorage, but wait 300 ms after the last change so a streaming answer
  // (dozens of updates per second) doesn't rewrite storage on every piece.
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(threads));
      } catch {
        /* storage full or blocked: the app still works, history just won't persist */
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [threads]);

  const createThread = useCallback((title) => {
    const thread = { id: uid(), title, serverChatId: null, updatedAt: Date.now(), messages: [] };
    setThreads((all) => [thread, ...all]);
    return thread.id;
  }, []);

  // All changes go through functional updates (all => newAll), which React applies in order.
  // That is what makes it safe to create a thread and add messages to it in the same click.
  const updateThread = useCallback(
    (id, change) =>
      setThreads((all) => all.map((t) => (t.id === id ? { ...change(t), updatedAt: Date.now() } : t))),
    []
  );

  const addMessage = useCallback(
    (id, message) => updateThread(id, (t) => ({ ...t, messages: [...t.messages, message] })),
    [updateThread]
  );

  const patchMessage = useCallback(
    (id, messageId, change) =>
      updateThread(id, (t) => ({
        ...t,
        messages: t.messages.map((m) => (m.id === messageId ? change(m) : m)),
      })),
    [updateThread]
  );

  const removeThread = useCallback((id) => setThreads((all) => all.filter((t) => t.id !== id)), []);
  const clearAll = useCallback(() => setThreads([]), []);

  return { threads, createThread, updateThread, addMessage, patchMessage, removeThread, clearAll };
}
