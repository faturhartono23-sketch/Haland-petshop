import { useEffect } from 'react';

export function useRefetchOnFocus(callback: () => void | Promise<void>) {
  useEffect(() => {
    function handleFocus() {
      void callback();
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void callback();
      }
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [callback]);
}
