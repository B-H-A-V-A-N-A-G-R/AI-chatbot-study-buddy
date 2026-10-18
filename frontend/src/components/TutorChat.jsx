import { useEffect, useRef, useState } from 'react';
import { createChat, getHistory, sendMessage } from '../api.js';
import TokenBadge from './TokenBadge.jsx';

// We remember the conversation id in the browser, so refreshing the page continues
// the same conversation (the server still has the messages in its memory).
const STORAGE_KEY = 'studybuddy.chatId';

export default function TutorChat() {
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]); // [{ role: 'user' | 'assistant', text, usage? }]
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef(null);  // used to scroll to the newest message
  const started = useRef(false);   // React StrictMode runs effects twice in development; this guards that

  // ---- On first load: reuse the saved conversation id, or ask the server for a new one ----
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function init() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          // Ask the server what was said so far, and redraw it.
          const history = await getHistory(saved);
          setChatId(saved);
          setMessages(history.map((m) => ({ role: m.role.toLowerCase(), text: m.text })));
        } else {
          await startNewChat();
        }
      } catch (e) {
        setError(e.message);
      }
    }
    init();
  }, []);

  // Scroll down whenever a message is added.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ---- New chat: get a fresh conversation id. The old chat's memory stays on the server. ----
  async function startNewChat() {
    setError('');
    const { chatId: id } = await createChat();
    localStorage.setItem(STORAGE_KEY, id);
    setChatId(id);
    setMessages([]);
  }

  // ---- Send a message ----
  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || !chatId) return;

    setInput('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text }]); // show the user's message immediately
    setLoading(true);

    try {
      // The chat id travels with EVERY message. That is how the server knows which
      // conversation's history to add to the prompt.
      const reply = await sendMessage(chatId, text);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply.answer, usage: reply.usage }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Chat with your tutor</h2>
          <p className="muted">
            The tutor remembers this conversation. Watch the <strong>prompt</strong> token count grow
            with every message: the whole history is re-sent each time, because the model itself has no memory.
          </p>
        </div>
        <button className="secondary" onClick={() => startNewChat().catch((e) => setError(e.message))}>
          New chat
        </button>
      </div>

      {chatId && <p className="muted small">Conversation id: <code>{chatId}</code></p>}

      <div className="chat-log">
        {messages.length === 0 && !loading && (
          <p className="muted">Try: “My name is Ravi and I am learning Spring AI.” Then ask “What is my name?”</p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <div className="bubble-text">{m.text}</div>
            {m.usage && <TokenBadge usage={m.usage} />}
          </div>
        ))}

        {loading && <div className="bubble assistant typing">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="error">{error}</p>}

      <form className="row" onSubmit={handleSend}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about Java or Spring…"
          maxLength={2000}
          disabled={!chatId}
        />
        <button type="submit" disabled={loading || !input.trim() || !chatId}>Send</button>
      </form>
    </div>
  );
}
