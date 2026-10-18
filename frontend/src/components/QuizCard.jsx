// An interactive quiz shown inside the conversation.
//
// `quiz` is the object Spring AI built with .entity(Quiz.class):
//    { topic, questions: [{ question, options: [4 strings], correctIndex, explanation }] }
// `picked` remembers the chosen option per question: { 0: 2, 1: 0 }  (question index -> option index)
export default function QuizCard({ quiz, picked = {}, onPick }) {
  const total = quiz.questions.length;
  const answered = Object.keys(picked).length;
  const score = quiz.questions.filter((q, i) => picked[i] === q.correctIndex).length;

  return (
    <div className="quiz-card">
      <div className="quiz-head">
        <strong>{quiz.topic || 'Quiz'}</strong>
        <span className="quiz-score">
          {score} / {total} correct{answered < total ? ` · ${total - answered} left` : ' · done'}
        </span>
      </div>

      {quiz.questions.map((q, qi) => {
        const chosen = picked[qi];
        const done = chosen !== undefined;
        return (
          <div className="question" key={qi}>
            <h4>
              {qi + 1}. {q.question}
            </h4>

            {q.options.map((option, oi) => {
              // After answering: right answer turns green, a wrong choice turns red.
              let cls = 'option';
              if (done && oi === q.correctIndex) cls += ' correct';
              else if (done && oi === chosen) cls += ' wrong';
              return (
                <button key={oi} className={cls} disabled={done} onClick={() => onPick(qi, oi)}>
                  <span className="letter">{String.fromCharCode(65 + oi)}</span>
                  <span>{option}</span>
                </button>
              );
            })}

            {done && <p className="explanation">{q.explanation}</p>}
          </div>
        );
      })}
    </div>
  );
}
