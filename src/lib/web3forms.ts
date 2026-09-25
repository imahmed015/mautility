import { SITE } from '../data/site';

// Everything the site's forms share about sending to Web3Forms (the form-to-email service
// named in the privacy policy). Each form keeps its own fields, validation and UI.
export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
export const WEB3FORMS_ACCESS_KEY = import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GENERIC_ERROR = 'Something went wrong. Please try again or email us directly.';
const NETWORK_ERROR = 'We could not reach the server. Please check your connection and try again.';

// Shown when someone submits before Cloudflare Turnstile has produced a token (or it's
// blocked, e.g. by a privacy extension) — clearer than Web3Forms' own rejection.
export const SECURITY_CHECK_PENDING = `Please wait a moment for the security check to finish, then try again. If it keeps happening, email us at ${SITE.email}.`;

export type SubmitResult = { ok: true } | { ok: false; message: string };

/**
 * Sends one submission to Web3Forms. `fields` is everything except the access key — include
 * `subject` and the `cf-turnstile-response` token. Never throws: network failures and
 * Web3Forms rejections both come back as `{ ok: false, message }` ready to show the visitor.
 */
export async function submitToWeb3Forms(fields: Record<string, string>): Promise<SubmitResult> {
  try {
    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: WEB3FORMS_ACCESS_KEY, ...fields }),
    });
    const result = await response.json();
    return result.success ? { ok: true } : { ok: false, message: result.message || GENERIC_ERROR };
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}
