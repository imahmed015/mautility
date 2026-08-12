import { useEffect, useState, type RefObject } from 'react';

// Minimal shape of the global `window.turnstile` API injected by
// https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit
declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

/**
 * Renders a Cloudflare Turnstile widget into `containerRef` and returns the
 * current response token (or '' until solved).
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

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    let widgetId: string | undefined;
    let pollId: ReturnType<typeof setInterval> | undefined;

    const renderWidget = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      widgetId = window.turnstile.render(containerRef.current, {
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
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef identity is stable
  }, [siteKey]);

  return token;
}
