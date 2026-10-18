// Small inline SVG icons (no icon library needed). Each one is a component:  <MicIcon size={20} />
// They use "currentColor", so they take the text color of whatever button they are inside.

const make =
  (children) =>
  ({ size = 20, ...rest }) =>
    (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    );

export const MenuIcon = make(<path d="M4 6h16M4 12h16M4 18h16" />);
export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </>
);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const CloseIcon = make(<path d="M18 6L6 18M6 6l12 12" />);
export const MicIcon = make(
  <>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </>
);
export const SendIcon = make(<path d="M12 19V5M5 12l7-7 7 7" />);
export const StopIcon = make(<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />);
export const EditIcon = make(
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </>
);
export const BookIcon = make(
  <>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </>
);
export const CheckSquareIcon = make(
  <>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </>
);
export const SlidersIcon = make(
  <>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
    <path d="M1 14h6M9 8h6M17 16h6" />
  </>
);
export const ChevronDownIcon = make(<path d="M6 9l6 6 6-6" />);
export const TrashIcon = make(
  <>
    <path d="M3 6h18" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </>
);
export const CopyIcon = make(
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>
);
export const SidebarIcon = make(
  <>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
  </>
);

// The app's own little logo: a gradient circle with an open book.
export function Mark({ size = 28 }) {
  return (
    <span className="mark" style={{ width: size, height: size }} aria-hidden="true">
      <BookIcon size={Math.round(size * 0.58)} />
    </span>
  );
}
