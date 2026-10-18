import { useEffect, useRef, useState } from 'react';
import { createChat, generateQuiz, sendMessage, streamExplain } from './api.js';
import Composer from './components/Composer.jsx';
import { EditIcon, MenuIcon } from './components/Icons.jsx';
import MessageList from './components/MessageList.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useMedia } from './hooks/useMedia.js';
import { uid, useThreads } from './hooks/useThreads.js';

// ---------------------------------------------------------------------------------------
// The three modes. They match the three backend features:
//   chat    -> POST /api/tutor/chats/{id}/messages   (tutor with MEMORY)
//   explain -> GET  /api/study/explain/stream        (prompt template + STREAMING)
//   quiz    -> GET  /api/study/quiz                  (STRUCTURED OUTPUT with entity())
// ---------------------------------------------------------------------------------------
const MODES = {
  chat: {
    label: 'Chat',
    heading: 'What would you like to learn today?',
    placeholder: 'Ask your tutor about Java or Spring',
    suggestions: [
      'What is the difference between an interface and an abstract class?',
      'What does @Autowired actually do?',
      'Help me understand Java streams',
    ],
  },
  explain: {
    label: 'Explain',
    heading: 'Which topic should I explain?',
    placeholder: 'Enter a topic, for example Dependency Injection',
    suggestions: ['Dependency Injection', 'Java records', '@Transactional'],
  },
  quiz: {
    label: 'Quiz',
    heading: 'What should I quiz you on?',
    placeholder: 'Enter a quiz topic, for example Java collections',
    suggestions: ['Java collections', 'Spring Boot basics', 'Java streams'],
  },
};

const titleFor = (mode, prompt) => {
  const short = prompt.length > 44 ? `${prompt.slice(0, 44)}…` : prompt;
  return mode === 'explain' ? `Explain: ${short}` : mode === 'quiz' ? `Quiz: ${short}` : short;
};

const SIDEBAR_KEY = 'studybuddy.sidebar';

export default function App() {
  const { threads, createThread, updateThread, addMessage, patchMessage, removeThread, clearAll } = useThreads();

  const [activeId, setActiveId] = useState(null); // null = the greeting screen (no chat open)
  const [mode, setMode] = useState('chat');
  const [level, setLevel] = useState('beginner');
  const [count, setCount] = useState(3);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);       // waiting for a reply
  const [canStop, setCanStop] = useState(false); // only streaming answers can be stopped

  const isMobile = useMedia('(max-width: 820px)');
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
    } catch {
      return false;
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const stickRef = useRef(true);  // true while the person is at the bottom, so new text keeps scrolling into view
  const abortRef = useRef(null);  // lets the Stop button cancel a streaming request

  // A ref that always holds the latest threads, so async code below never reads stale data.
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  const active = threads.find((t) => t.id === activeId) || null;
  const isHero = !active || active.messages.length === 0;

  // Remember whether the sidebar is collapsed.
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'open');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  // Keep the newest text in view while the answer grows (unless the person scrolled up to read).
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [active?.messages, activeId]);

  function onScroll() {
    const el = scrollRef.current;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 0);

  // ---- navigation -------------------------------------------------------------------
  function startNew(nextMode = mode) {
    abortRef.current?.abort(); // stop a stream that is still running
    setActiveId(null);
    setMode(nextMode);
    setDraft('');
    setDrawerOpen(false);
    stickRef.current = true;
    focusInput();
  }

  function selectThread(id) {
    setActiveId(id);
    setDrawerOpen(false);
    stickRef.current = true;
    focusInput();
  }

  function deleteThread(id) {
    removeThread(id);
    if (id === activeId) setActiveId(null);
  }

  function toggleSidebar() {
    if (isMobile) setDrawerOpen((o) => !o);
    else setCollapsed((c) => !c);
  }

  // ---- sending ----------------------------------------------------------------------
  async function send(raw) {
    const prompt = raw.trim();
    if (!prompt || busy) return;

    const runMode = mode;

    // First message on the greeting screen: create the thread (and so the sidebar entry).
    let id = activeId;
    if (!id) {
      id = createThread(titleFor(runMode, prompt));
      setActiveId(id);
    }

    const assistantId = uid();
    setDraft('');
    stickRef.current = true;
    addMessage(id, { id: uid(), role: 'user', kind: 'text', text: prompt, mode: runMode });
    addMessage(id, {
      id: assistantId,
      role: 'assistant',
      kind: runMode === 'quiz' ? 'quiz' : 'text',
      text: '',
      pending: true,
    });
    setBusy(true);

    try {
      if (runMode === 'chat') {
        // The conversation id is what makes the backend remember earlier messages.
        // Create it once per thread, then send it with every message.
        let serverChatId = threadsRef.current.find((t) => t.id === id)?.serverChatId;
        if (!serverChatId) {
          serverChatId = (await createChat()).chatId;
          updateThread(id, (t) => ({ ...t, serverChatId }));
        }
        const reply = await sendMessage(serverChatId, prompt);
        patchMessage(id, assistantId, (m) => ({ ...m, text: reply.answer, usage: reply.usage, pending: false }));
      } else if (runMode === 'explain') {
        const controller = new AbortController();
        abortRef.current = controller;
        setCanStop(true);
        await streamExplain(
          prompt,
          level,
          // Called for every piece of the answer: append it to the text we already have.
          (chunk) => patchMessage(id, assistantId, (m) => ({ ...m, text: m.text + chunk, pending: false })),
          controller.signal
        );
        patchMessage(id, assistantId, (m) => ({ ...m, pending: false }));
      } else {
        const quiz = await generateQuiz(prompt, count);
        patchMessage(id, assistantId, (m) => ({ ...m, quiz, picked: {}, pending: false }));
        // A quiz is tall. Showing its LAST question would hide question 1, so instead of
        // scrolling to the bottom, bring the top of the quiz into view once it has rendered.
        stickRef.current = false;
        setTimeout(() => document.getElementById(`msg-${assistantId}`)?.scrollIntoView({ block: 'start' }), 60);
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        patchMessage(id, assistantId, (m) => ({ ...m, pending: false })); // person pressed Stop: keep what arrived
      } else {
        patchMessage(id, assistantId, (m) => ({ ...m, pending: false, error: e.message || 'Something went wrong.' }));
      }
    } finally {
      setBusy(false);
      setCanStop(false);
      abortRef.current = null;
    }
  }

  function pickAnswer(messageId, questionIndex, optionIndex) {
    patchMessage(activeId, messageId, (m) => ({ ...m, picked: { ...m.picked, [questionIndex]: optionIndex } }));
  }

  // ---- screen -----------------------------------------------------------------------
  const info = MODES[mode];

  return (
    <div className="shell">
      <Sidebar
        compact={collapsed && !isMobile}
        open={drawerOpen}
        onToggle={toggleSidebar}
        onCloseDrawer={() => setDrawerOpen(false)}
        threads={threads}
        activeId={activeId}
        mode={mode}
        onNew={startNew}
        onSelect={selectThread}
        onDelete={deleteThread}
        onClearAll={() => {
          clearAll();
          setActiveId(null);
        }}
      />

      <main className={`main${isHero ? ' is-hero' : ''}`}>
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <MenuIcon />
          </button>
          <div className="topbar-title">{!isHero && active ? active.title : ''}</div>
          <button className="icon-btn" onClick={() => startNew(mode)} aria-label="New chat" title="New chat">
            <EditIcon />
          </button>
        </header>

        <div className="scroll" ref={scrollRef} onScroll={onScroll}>
          {isHero ? (
            <div className="hero">
              <h1>{info.heading}</h1>
            </div>
          ) : (
            <MessageList messages={active.messages} onPick={pickAnswer} />
          )}
        </div>

        <div className="dock">
          <Composer
            value={draft}
            onChange={setDraft}
            onSend={send}
            onNew={() => startNew(mode)}
            onStop={() => abortRef.current?.abort()}
            inputRef={inputRef}
            mode={mode}
            placeholder={info.placeholder}
            level={level}
            onLevel={setLevel}
            count={count}
            onCount={setCount}
            busy={busy}
            canStop={canStop}
          />

          <div className="chips" role="group" aria-label="Mode">
            {Object.entries(MODES).map(([id, m]) => (
              <button
                key={id}
                className="chip"
                aria-pressed={mode === id}
                onClick={() => {
                  setMode(id);
                  focusInput();
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {isHero ? (
            <div className="suggestions">
              {info.suggestions.map((s) => (
                <button
                  key={s}
                  className="suggestion"
                  onClick={() => {
                    setDraft(s);
                    focusInput();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <p className="fineprint">Study Buddy can make mistakes, so double-check important answers.</p>
          )}
        </div>
      </main>
    </div>
  );
}
