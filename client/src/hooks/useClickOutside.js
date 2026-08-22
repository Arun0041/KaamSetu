import { useEffect } from 'react';

/**
 * Hook that fires `handler` when a click/touch lands outside `ref`.
 * Useful for closing dropdowns, modals, and popovers.
 */
export default function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
