import { useRef, useState } from 'react';
import { explainWithUsage, streamExplain } from '../api.js';
import TokenBadge from './TokenBadge.jsx';

export default function Explain() {
  const [topic, setTopic] = useState('Dependency Injection');
  const [level, setLevel] = useState('beginner');
  const [answer, setAnswer] = useState('');
  const [usage, setUsage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // An AbortController lets the "Stop" button cancel a streaming request in progress.
  const abortRef = useRef(null);

  function reset() {
    setAnswer('');
    setUsage(null);
    setError('');
  }

  // ---- Option 1: streaming. Text appears word by word as the model writes it. ----
  async function handleStream() {
    reset();
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamExplain(
        topic,
        level,
        // Called for every piece. We append it to the text already shown.
        // (The functional form "prev => prev + chunk" is needed because many chunks arrive quickly.)
        (chunk) => setAnswer((prev) => prev + chunk),
        controller.signal
      );
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message); // pressing Stop is not an error
    } finally {
      setBusy(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  // ---- Option 2: wait for the whole answer, which also gives us the token usage. ----
  async function handleFull() {
    reset();
    setBusy(true);
    try {
      const result = await explainWithUsage(topic, level);
      setAnswer(result.answer);
      setUsage(result.usage);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Explain a topic</h2>
      <p className="muted">
        The server fills a prompt template (<code>prompts/explain.st</code>) with your topic and level.
        “Stream” shows the answer as it is generated; “Full answer” waits, then shows the token usage.
      </p>

      <div className="row wrap">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Java streams, @Transactional, records"
          maxLength={200}
        />
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div className="row">
        <button onClick={handleStream} disabled={busy || !topic.trim()}>Stream</button>
        <button className="secondary" onClick={handleFull} disabled={busy || !topic.trim()}>
          Full answer + tokens
        </button>
        {busy && <button className="danger" onClick={handleStop}>Stop</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {(answer || busy) && (
        <div className="answer-box">
          {/* white-space: pre-wrap (see CSS) keeps the model's line breaks and code indentation */}
          <pre className="answer">{answer || 'Thinking…'}</pre>
          <TokenBadge usage={usage} />
        </div>
      )}
    </div>
  );
}
