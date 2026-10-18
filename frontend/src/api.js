// All calls to the Spring Boot backend live in this one file, so the React components
// stay simple. Every URL starts with /api, which Vite forwards to http://localhost:8080
// (see vite.config.js).

/**
 * Turns a failed HTTP response into an Error with a readable message.
 * Our Spring backend returns errors as JSON like {"status":400,"detail":"Message must not be empty."}.
 */
async function toError(res) {
  try {
    const body = await res.json();
    return new Error(body.detail || `Request failed (${res.status})`);
  } catch {
    return new Error(`Request failed (${res.status})`);
  }
}

/** Small helper: call the API, throw on error, return parsed JSON. */
async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw await toError(res);
  // DELETE returns an empty body, so only parse JSON when there is some.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ---------------------------------------------------------------------------
// Tutor chat (with memory)
// ---------------------------------------------------------------------------

/** Asks the server for a new conversation id. -> { chatId } */
export const createChat = () => request('/api/tutor/chats', { method: 'POST' });

/** Sends one message in a conversation. -> { answer, usage: {promptTokens, completionTokens, totalTokens} } */
export const sendMessage = (chatId, message) =>
  request(`/api/tutor/chats/${encodeURIComponent(chatId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

/** Loads the stored messages of a conversation. -> [{ role: 'USER' | 'ASSISTANT', text }] */
export const getHistory = (chatId) =>
  request(`/api/tutor/chats/${encodeURIComponent(chatId)}/messages`);

// ---------------------------------------------------------------------------
// Explain
// ---------------------------------------------------------------------------

/** Whole answer at once, plus token usage. -> { answer, usage } */
export const explainWithUsage = (topic, level) =>
  request(`/api/study/explain/usage?${new URLSearchParams({ topic, level })}`);

/**
 * Streaming explanation. The server sends one small JSON object per line, e.g.
 *   {"text":"Depend"}
 *   {"text":"ency inj"}
 * as soon as the model produces each piece. We read the response body piece by piece
 * and call onChunk(text) for every piece, so the UI can append it immediately.
 *
 * signal: an AbortSignal, so the user can press "Stop".
 */
export async function streamExplain(topic, level, onChunk, signal) {
  const res = await fetch(`/api/study/explain/stream?${new URLSearchParams({ topic, level })}`, { signal });
  if (!res.ok) throw await toError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = ''; // holds an incomplete line until the rest of it arrives

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Network packets don't line up with our JSON lines, so collect text and split on newlines.
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // the last element may be a half-received line: keep it for next time

    for (const line of lines) {
      if (line.trim()) onChunk(JSON.parse(line).text);
    }
  }
  if (buffer.trim()) onChunk(JSON.parse(buffer).text);
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

/** Generates a quiz. -> { topic, questions: [{ question, options[4], correctIndex, explanation }] } */
export const generateQuiz = (topic, count) =>
  request(`/api/study/quiz?${new URLSearchParams({ topic, count })}`);
