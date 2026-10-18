import { useState } from 'react';
import {
  BookIcon,
  CheckSquareIcon,
  EditIcon,
  Mark,
  SearchIcon,
  SidebarIcon,
  SlidersIcon,
  TrashIcon,
} from './Icons.jsx';

// The left panel: brand, shortcuts, searchable chat history, and a small profile area.
//
//   compact  = desktop "rail" mode: only icons are shown (the sidebar is collapsed)
//   open     = phone mode: the sidebar slides in over the page as a drawer
export default function Sidebar({
  compact,
  open,
  onToggle,
  onCloseDrawer,
  threads,
  activeId,
  mode,
  onNew,
  onSelect,
  onDelete,
  onClearAll,
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Newest first, filtered by the search box.
  const visible = [...threads]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase()));

  const onNewScreen = activeId === null; // "no chat open" = the greeting screen

  const nav = [
    { id: 'chat', label: 'New chat', icon: <EditIcon /> },
    { id: 'explain', label: 'Explain', icon: <BookIcon /> },
    { id: 'quiz', label: 'Quiz', icon: <CheckSquareIcon /> },
  ];

  function clearAll() {
    if (window.confirm('Delete all chats from this browser?')) {
      onClearAll();
      setSettingsOpen(false);
    }
  }

  return (
    <>
      {open && <div className="backdrop" onClick={onCloseDrawer} />}

      <aside className={`sidebar${compact ? ' compact' : ''}${open ? ' open' : ''}`} aria-label="Sidebar">
        <div className="side-top">
          {!compact && (
            <div className="brand">
              <Mark />
              <span>Study Buddy</span>
            </div>
          )}
          <div className="side-top-actions">
            {!compact && (
              <button
                className={`icon-btn${searching ? ' selected' : ''}`}
                onClick={() => {
                  setSearching((s) => !s);
                  setQuery('');
                }}
                aria-label="Search chats"
                title="Search chats"
              >
                <SearchIcon />
              </button>
            )}
            <button className="icon-btn" onClick={onToggle} aria-label="Toggle sidebar" title="Toggle sidebar">
              <SidebarIcon />
            </button>
          </div>
        </div>

        <nav className="nav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item${onNewScreen && mode === item.id ? ' active' : ''}`}
              onClick={() => onNew(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {!compact && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {!compact && (
          <div className="recents">
            {searching && (
              <input
                className="search-input"
                autoFocus
                placeholder="Search chats"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            )}
            <div className="section-label">Recent</div>

            {visible.length === 0 && (
              <p className="empty-note">{threads.length === 0 ? 'Your chats will appear here.' : 'No chats match.'}</p>
            )}

            <ul className="thread-list">
              {visible.map((t) => (
                <li key={t.id} className={`thread-row${t.id === activeId ? ' active' : ''}`}>
                  <button className="thread-btn" onClick={() => onSelect(t.id)} title={t.title}>
                    {t.title}
                  </button>
                  <button className="icon-btn tiny del" onClick={() => onDelete(t.id)} aria-label="Delete chat" title="Delete chat">
                    <TrashIcon size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="side-foot">
          {settingsOpen && !compact && (
            <div className="popover" role="menu">
              <button role="menuitem" className="popover-item danger" onClick={clearAll}>
                <TrashIcon size={16} /> Clear all chats
              </button>
            </div>
          )}
          <div className="profile">
            <span className="avatar" aria-hidden="true">S</span>
            {!compact && (
              <div className="who">
                <strong>Student</strong>
                <small>Powered by Claude</small>
              </div>
            )}
            {!compact && (
              <button
                className={`icon-btn${settingsOpen ? ' selected' : ''}`}
                onClick={() => setSettingsOpen((s) => !s)}
                aria-label="Settings"
                title="Settings"
              >
                <SlidersIcon />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
