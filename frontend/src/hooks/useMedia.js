import { useEffect, useState } from 'react';

// true while the browser window matches a CSS media query, e.g. useMedia('(max-width: 820px)').
// We use it to switch the sidebar between "docked" (desktop) and "drawer" (phone).
export function useMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}
