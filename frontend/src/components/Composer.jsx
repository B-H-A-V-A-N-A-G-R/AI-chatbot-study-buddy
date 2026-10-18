import { useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech.js';
import { ChevronDownIcon, MicIcon, PlusIcon, SendIcon, StopIcon } from './Icons.jsx';

// The big rounded input box:  [ + ]  [ text ............ ]  [ option ]  [ mic / send / stop ]
//
//   - "+"       starts a fresh chat
//   - option    depends on the mode: difficulty level (Explain) or number of questions (Quiz)
//   - right     mic when the box is empty, send arrow when there is text, stop while streaming
//   - Enter sends, Shift+Enter adds a new line
export default function Composer({
  value,
  onChange,
  onSend,
  onNew,
  onStop,
  inputRef,
  mode,
  placeholder,
  level,
  onLevel,
  count,
  onCount,
  busy,
  canStop,
}) {
  const baseRef = useRef(''); // text that was already in the box when dictation started

  const speech = useSpeech((heard) => {
    onChange((baseRef.current + ' ' + heard).trim());
  });

  function toggleMic() {
    if (!speech.listening) baseRef.current = value;
    speech.toggle();
  }

  // Grow the box with the text (up to 160px, then it scrolls).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value, inputRef]);

  function handleKeyDown(e) {
    // isComposing: don't send while the person is still choosing characters in an input method (IME)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend(value);
    }
  }

  const hasText = value.trim().length > 0;

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        onSend(value);
      }}
    >
      <button type="button" className="icon-btn" onClick={onNew} aria-label="New chat" title="New chat">
        <PlusIcon />
      </button>

      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={speech.listening ? 'Listening…' : placeholder}
        aria-label="Message"
        maxLength={mode === 'chat' ? 2000 : 200}
        autoFocus
      />

      {mode === 'explain' && (
        <label className="pill-select">
          <select value={level} onChange={(e) => onLevel(e.target.value)} aria-label="Difficulty level">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <ChevronDownIcon size={16} className="chev" />
        </label>
      )}

      {mode === 'quiz' && (
        <label className="pill-select">
          <select value={count} onChange={(e) => onCount(Number(e.target.value))} aria-label="Number of questions">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} question{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={16} className="chev" />
        </label>
      )}

      {canStop ? (
        <button type="button" className="icon-btn primary" onClick={onStop} aria-label="Stop" title="Stop">
          <StopIcon />
        </button>
      ) : hasText ? (
        <button
          type="submit"
          className="icon-btn primary"
          disabled={busy}
          aria-label="Send"
          title={busy ? 'Waiting for the reply…' : 'Send'}
        >
          <SendIcon />
        </button>
      ) : speech.supported ? (
        <button
          type="button"
          className={`icon-btn${speech.listening ? ' live' : ''}`}
          onClick={toggleMic}
          aria-label={speech.listening ? 'Stop dictation' : 'Dictate'}
          title={speech.listening ? 'Stop dictation' : 'Dictate'}
        >
          <MicIcon />
        </button>
      ) : null}
    </form>
  );
}
