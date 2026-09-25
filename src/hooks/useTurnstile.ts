import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

// Minimal shape of the global `window.turnstile` API injected by
// https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit
declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

/**
 * Renders a Cloudflare Turnstile widget into `containerRef` and returns the current
 * response token (or '' until solved), plus a `reset` function.
 *
 * Deliberately renders *explicitly* via `window.turnstile.render(...)` inside
 * a `useEffect`, rather than letting the Turnstile script auto-scan the page
 * for `.cf-turnstile[data-sitekey]` divs on load. Auto-rendering mutates the
 * container's DOM (injecting the challenge iframe) as soon as the script
 * loads, which can race with — and lose to — React's own hydration pass on
 * that same node, producing "Hydration failed" (React error #418/#423).
 * Rendering explicitly after mount sidesteps that race entirely: React has
 * already finished with the (empty) container by the time Turnstile touches it.
 *
 * Requires the api.js script to be loaded with `?render=explicit` — see
 * contact.astro / feedback.astro.
 */
export function useTurnstile(containerRef: RefObject<HTMLDivElement | null>, siteKey: string | undefined) {
  const [token, setToken] = useState('');
  const widgetIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    const renderWidget = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (t: string) => setToken(t),
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      // The script loads async/defer, so it may not be ready yet on mount — poll briefly.
      pollId = setInterval(() => {
        if (window.turnstile) {
          clearInterval(pollId);
          renderWidget();
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef identity is stable
  }, [siteKey]);

  // Turnstile tokens are single-use: once a submission has sent one to Web3Forms (which
  // verifies it server-side), it can't be verified again. Call this after every submit
  // attempt so a retry, or a second enquiry, gets a fresh token instead of a spent one.
  const reset = useCallback(() => {
    setToken('');
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }, []);

  return { token, reset };
}
