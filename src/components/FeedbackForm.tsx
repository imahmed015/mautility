import { useId, useRef, useState, type FormEvent } from 'react';
import { SERVICE_OPTIONS } from '../data/site';
import { useTurnstile } from '../hooks/useTurnstile';

type FormState = {
  name: string;
  email: string;
  services: string[];
  rating: string;
  feedback: string;
  consentToPublish: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const RATING_OPTIONS = ['Excellent', 'Good', 'Average', 'Poor'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_STATE: FormState = {
  name: '',
  email: '',
  services: [],
  rating: '',
  feedback: '',
  consentToPublish: false,
};

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Please enter your name.';
  } else if (values.name.trim().length < 2) {
    errors.name = 'Please enter a valid name.';
  }

  if (!values.email.trim()) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.rating) {
    errors.rating = 'Please select a rating.';
  }

  if (!values.feedback.trim()) {
    errors.feedback = 'Please share some feedback before submitting.';
  } else if (values.feedback.trim().length < 10) {
    errors.feedback = 'Please provide a little more detail (at least 10 characters).';
  }

  return errors;
}

export default function FeedbackForm() {
  const [values, setValues] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState('');
  const idPrefix = useId();
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileToken = useTurnstile(turnstileRef, import.meta.env.PUBLIC_TURNSTILE_SITE_KEY);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleService = (service: string) => {
    setValues((prev) => {
      const services = prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service];
      return { ...prev, services };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const honeypot = (form.elements.namedItem('botcheck') as HTMLInputElement | null)?.value;

    const validationErrors = validate(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (honeypot) {
      setStatus('success');
      return;
    }

    setStatus('sending');
    setServerMessage('');

    try {
      const accessKey = import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY;

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: 'New private feedback — MA Utility Solutions website',
          from_name: values.name,
          name: values.name,
          email: values.email,
          services_used: values.services.join(', ') || '(not specified)',
          rating: values.rating,
          feedback: values.feedback,
          consent_to_publish_as_testimonial: values.consentToPublish ? 'YES' : 'No',
          'cf-turnstile-response': turnstileToken,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setValues(INITIAL_STATE);
        setErrors({});
      } else {
        setStatus('error');
        setServerMessage(result.message || 'Something went wrong. Please try again or email us directly.');
      }
    } catch {
      setStatus('error');
      setServerMessage('We could not reach the server. Please check your connection and try again.');
    }
  };

  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot field — hidden from real users; left blank by them, but bots tend to fill every field. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor={fieldId('botcheck')}>Leave this field blank</label>
        <input type="text" id={fieldId('botcheck')} name="botcheck" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Cloudflare Turnstile — spam protection. See ContactForm.tsx / useTurnstile.ts for wiring notes. */}
      {import.meta.env.PUBLIC_TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={fieldId('name')} className="field-label">
            Name <span className="text-amber-dark">*</span>
          </label>
          <input
            id={fieldId('name')}
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            className={`field-input ${errors.name ? 'field-input-error' : ''}`}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? fieldId('name-error') : undefined}
          />
          {errors.name && (
            <p id={fieldId('name-error')} className="field-error">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={fieldId('email')} className="field-label">
            Email <span className="text-amber-dark">*</span>
          </label>
          <input
            id={fieldId('email')}
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            className={`field-input ${errors.email ? 'field-input-error' : ''}`}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? fieldId('email-error') : undefined}
          />
          {errors.email && (
            <p id={fieldId('email-error')} className="field-error">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="field-label">Services you used</legend>
        <div className="flex flex-wrap gap-3">
          {SERVICE_OPTIONS.map((service) => {
            const checkboxId = fieldId(`service-${service}`);
            const checked = values.services.includes(service);
            return (
              <label
                key={service}
                htmlFor={checkboxId}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  checked ? 'border-amber bg-amber/15 text-navy' : 'border-slate-300 text-ink-light hover:border-amber/60'
                }`}
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  name="services"
                  value={service}
                  checked={checked}
                  onChange={() => toggleService(service)}
                  className="h-4 w-4 rounded border-slate-400 text-amber-dark focus:ring-amber"
                />
                {service}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="sm:max-w-xs">
        <label htmlFor={fieldId('rating')} className="field-label">
          Overall rating <span className="text-amber-dark">*</span>
        </label>
        <select
          id={fieldId('rating')}
          name="rating"
          value={values.rating}
          onChange={(e) => setField('rating', e.target.value)}
          className={`field-input ${errors.rating ? 'field-input-error' : ''}`}
          aria-invalid={!!errors.rating}
          aria-describedby={errors.rating ? fieldId('rating-error') : undefined}
        >
          <option value="">Select a rating…</option>
          {RATING_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.rating && (
          <p id={fieldId('rating-error')} className="field-error">
            {errors.rating}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={fieldId('feedback')} className="field-label">
          Your feedback <span className="text-amber-dark">*</span>
        </label>
        <textarea
          id={fieldId('feedback')}
          name="feedback"
          rows={5}
          value={values.feedback}
          onChange={(e) => setField('feedback', e.target.value)}
          className={`field-input resize-y ${errors.feedback ? 'field-input-error' : ''}`}
          aria-invalid={!!errors.feedback}
          aria-describedby={errors.feedback ? fieldId('feedback-error') : undefined}
        />
        {errors.feedback && (
          <p id={fieldId('feedback-error')} className="field-error">
            {errors.feedback}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-navy/10 bg-navy/[0.03] p-4">
        <label htmlFor={fieldId('consent')} className="flex cursor-pointer items-start gap-3">
          <input
            id={fieldId('consent')}
            type="checkbox"
            name="consentToPublish"
            checked={values.consentToPublish}
            onChange={(e) => setField('consentToPublish', e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-400 text-amber-dark focus:ring-amber"
          />
          <span className="text-sm text-ink">
            I'm happy for MA Utility Solutions to publish this feedback as a testimonial on the website.
          </span>
        </label>
        <p className="mt-2 pl-7 text-xs text-ink-light">
          This is optional and unticked by default. Feedback is otherwise kept private and is never published
          without this explicit consent.
        </p>
      </div>

      <div>
        <button type="submit" disabled={status === 'sending'} className="btn-primary w-full sm:w-auto">
          {status === 'sending' ? 'Sending…' : 'Submit feedback'}
        </button>
      </div>

      <div role="status" aria-live="polite">
        {status === 'success' && (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800 ring-1 ring-green-200">
            Thank you — your feedback has been received. We genuinely read every response.
          </p>
        )}
        {status === 'error' && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {serverMessage || 'Something went wrong. Please try again or email us directly.'}
          </p>
        )}
      </div>
    </form>
  );
}
