import { Mark } from './Icons.jsx';
import Markdown from './Markdown.jsx';
import QuizCard from './QuizCard.jsx';
import TokenBadge from './TokenBadge.jsx';

// Three bouncing dots, shown while we wait for the first piece of an answer.
function Thinking() {
  return (
    <div className="dots" aria-label="Thinking">
      <span />
      <span />
      <span />
    </div>
  );
}

function Message({ message, onPick }) {
  // The person's own message: a rounded bubble on the right.
  if (message.role === 'user') {
    return (
      <div className="msg user" id={`msg-${message.id}`}>
        <div className="user-bubble">{message.text}</div>
      </div>
    );
  }

  // The assistant: no bubble, just the logo and the text, like a document.
  const waiting = message.pending && !message.text && !message.quiz;
  return (
    // The id lets App.jsx scroll to the START of a long answer such as a quiz.
    <div className="msg assistant" id={`msg-${message.id}`}>
      <Mark size={30} />
      <div className="assistant-body">
        {waiting && <Thinking />}
        {message.kind === 'quiz'
          ? message.quiz && <QuizCard quiz={message.quiz} picked={message.picked} onPick={(qi, oi) => onPick(message.id, qi, oi)} />
          : message.text && <Markdown text={message.text} />}
        {message.error && <div className="msg-error">{message.error}</div>}
        {message.usage && <TokenBadge usage={message.usage} />}
      </div>
    </div>
  );
}

export default function MessageList({ messages, onPick }) {
  return (
    <div className="thread-inner">
      {messages.map((m) => (
        <Message key={m.id} message={m} onPick={onPick} />
      ))}
    </div>
  );
}
