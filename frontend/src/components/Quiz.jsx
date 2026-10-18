import { useState } from 'react';
import { generateQuiz } from '../api.js';

export default function Quiz() {
  const [topic, setTopic] = useState('Java streams');
  const [count, setCount] = useState(3);
  const [quiz, setQuiz] = useState(null);       // the Quiz object built by Spring AI's entity()
  const [picked, setPicked] = useState({});     // { questionIndex: chosenOptionIndex }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setQuiz(null);
    setPicked({});
    try {
      setQuiz(await generateQuiz(topic, count));
    } catch (e) {
      // Small local models sometimes return broken JSON. The message from the server explains that.
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // How many questions the user answered correctly so far.
  const answered = Object.keys(picked).length;
  const score = quiz
    ? quiz.questions.filter((q, i) => picked[i] === q.correctIndex).length
    : 0;

  return (
    <div className="card">
      <h2>Quiz generator</h2>
      <p className="muted">
        The model answers with JSON, and Spring AI converts it into Java objects
        (<code>.entity(Quiz.class)</code>), so this screen receives clean, typed data instead of a paragraph of text.
      </p>

      <div className="row wrap">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Quiz topic"
          maxLength={200}
        />
        <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} question{n > 1 ? 's' : ''}</option>
          ))}
        </select>
        <button onClick={handleGenerate} disabled={loading || !topic.trim()}>
          {loading ? 'Generating…' : 'Generate quiz'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {quiz && (
        <div className="quiz">
          <p className="score">Score: {score} / {quiz.questions.length} ({answered} answered)</p>

          {quiz.questions.map((q, qi) => {
            const chosen = picked[qi];
            const done = chosen !== undefined;
            return (
              <div className="question" key={qi}>
                <h3>{qi + 1}. {q.question}</h3>

                {q.options.map((opt, oi) => {
                  // After answering: green for the right option, red for a wrong choice.
                  let cls = 'option';
                  if (done && oi === q.correctIndex) cls += ' correct';
                  else if (done && oi === chosen) cls += ' wrong';
                  return (
                    <button
                      key={oi}
                      className={cls}
                      disabled={done}
                      onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                    </button>
                  );
                })}

                {done && <p className="explanation">{q.explanation}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
