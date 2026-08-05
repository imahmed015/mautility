import { useId, useState, type FormEvent } from 'react';
import { SERVICE_OPTIONS } from '../data/site';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  postcode: string;
  services: string[];
  concern: string;
  callTime: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const CONCERN_OPTIONS = [
  'Reducing costs',
  'Contract ending soon',
  'Switching supplier',
  'New home setup',
  'Not sure yet',
  'Other',
];

const CALL_TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Anytime'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Standard UK postcode pattern (covers all current formats, e.g. SW1A 1AA, M1 1AE, B33 8TH, CR2 6XH, DN55 1PT).
const UK_POSTCODE_REGEX =
  /^([Gg][Ii][Rr] ?0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})$/i;

const INITIAL_STATE: FormState = {
  fullName: '',
  email: '',
  phone: '',
  postcode: '',
  services: [],
  concern: '',
  callTime: '',
  message: '',
};

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = 'Please enter your full name.';
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = 'Please enter a valid name.';
  }

  if (!values.email.trim()) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.phone.trim()) {
    errors.phone = 'Please enter your phone number.';
  } else {
    const cleaned = values.phone.replace(/[\s\-()]/g, '');
    if (!/^\+?\d{10,15}$/.test(cleaned)) {
      errors.phone = 'Please enter a valid phone number (10–15 digits).';
    }
  }

  if (!values.postcode.trim()) {
    errors.postcode = 'Please enter your postcode.';
  } else if (!UK_POSTCODE_REGEX.test(values.postcode.trim())) {
    errors.postcode = 'Please enter a valid UK postcode.';
  }

  if (values.services.length === 0) {
    errors.services = 'Please select at least one service.';
  }

  if (!values.concern) {
    errors.concern = 'Please select your main concern.';
  }

  if (!values.callTime) {
    errors.callTime = 'Please select the best time to call.';
  }

  return errors;
}

export default function ContactForm() {
  const [values, setValues] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState('');
  const idPrefix = useId();

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

    // Basic spam trap: if the hidden honeypot field has been filled in (by a bot),
    // quietly no-op instead of submitting.
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
          subject: 'New enquiry — MA Utility Solutions website',
          from_name: values.fullName,
          full_name: values.fullName,
          email: values.email,
          phone: values.phone,
          postcode: values.postcode,
          services_interested_in: values.services.join(', '),
          main_concern: values.concern,
          best_time_to_call: values.callTime,
          message: values.message || '(no message provided)',
          // TODO: Once Cloudflare Turnstile is configured, add the token here, e.g.
          // 'cf-turnstile-response': turnstileToken,
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
      {/* Honeypot field — hidden from real users, left blank by them; bots tend to fill every field. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor={fieldId('botcheck')}>Leave this field blank</label>
        <input type="text" id={fieldId('botcheck')} name="botcheck" tabIndex={-1} autoComplete="off" />
      </div>

      {/*
        PLACEHOLDER: Cloudflare Turnstile
        Once a site key is issued, add the widget here, e.g.:
        <div className="cf-turnstile" data-sitekey={import.meta.env.PUBLIC_TURNSTILE_SITE_KEY}></div>
        and load the Turnstile script in Layout.astro's <head>. Then pass the resulting
        token as `cf-turnstile-response` in the Web3Forms payload above.
      */}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={fieldId('fullName')} className="field-label">
            Full Name <span className="text-amber-dark">*</span>
          </label>
          <input
            id={fieldId('fullName')}
            name="fullName"
            type="text"
            autoComplete="name"
            value={values.fullName}
            onChange={(e) => setField('fullName', e.target.value)}
            className={`field-input ${errors.fullName ? 'field-input-error' : ''}`}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? fieldId('fullName-error') : undefined}
          />
          {errors.fullName && (
            <p id={fieldId('fullName-error')} className="field-error">
              {errors.fullName}
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

        <div>
          <label htmlFor={fieldId('phone')} className="field-label">
            Phone <span className="text-amber-dark">*</span>
          </label>
          <input
            id={fieldId('phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="e.g. 07700 900123"
            value={values.phone}
            onChange={(e) => setField('phone', e.target.value)}
            className={`field-input ${errors.phone ? 'field-input-error' : ''}`}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? fieldId('phone-error') : undefined}
          />
          {errors.phone && (
            <p id={fieldId('phone-error')} className="field-error">
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={fieldId('postcode')} className="field-label">
            Postcode <span className="text-amber-dark">*</span>
          </label>
          <input
            id={fieldId('postcode')}
            name="postcode"
            type="text"
            autoComplete="postal-code"
            placeholder="e.g. YO31 7EX"
            value={values.postcode}
            onChange={(e) => setField('postcode', e.target.value.toUpperCase())}
            className={`field-input ${errors.postcode ? 'field-input-error' : ''}`}
            aria-invalid={!!errors.postcode}
            aria-describedby={errors.postcode ? fieldId('postcode-error') : undefined}
          />
          {errors.postcode && (
            <p id={fieldId('postcode-error')} className="field-error">
              {errors.postcode}
            </p>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="field-label">
          Services you're interested in <span className="text-amber-dark">*</span>
        </legend>
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
        {errors.services && <p className="field-error">{errors.services}</p>}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={fieldId('concern')} className="field-label">
            Main concern <span className="text-amber-dark">*</span>
          </label>
          <select
            id={fieldId('concern')}
            name="concern"
            value={values.concern}
            onChange={(e) => setField('concern', e.target.value)}
            className={`field-input ${errors.concern ? 'field-input-error' : ''}`}
            aria-invalid={!!errors.concern}
            aria-describedby={errors.concern ? fieldId('concern-error') : undefined}
          >
            <option value="">Select an option…</option>
            {CONCERN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.concern && (
            <p id={fieldId('concern-error')} className="field-error">
              {errors.concern}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={fieldId('callTime')} className="field-label">
            Best time to call <span className="text-amber-dark">*</span>
          </label>
          <select
            id={fieldId('callTime')}
            name="callTime"
            value={values.callTime}
            onChange={(e) => setField('callTime', e.target.value)}
            className={`field-input ${errors.callTime ? 'field-input-error' : ''}`}
            aria-invalid={!!errors.callTime}
            aria-describedby={errors.callTime ? fieldId('callTime-error') : undefined}
          >
            <option value="">Select an option…</option>
            {CALL_TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.callTime && (
            <p id={fieldId('callTime-error')} className="field-error">
              {errors.callTime}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={fieldId('message')} className="field-label">
          Message <span className="font-normal text-ink-light">(optional)</span>
        </label>
        <textarea
          id={fieldId('message')}
          name="message"
          rows={4}
          value={values.message}
          onChange={(e) => setField('message', e.target.value)}
          className="field-input resize-y"
        />
      </div>

      <div>
        <button type="submit" disabled={status === 'sending'} className="btn-primary w-full sm:w-auto">
          {status === 'sending' ? 'Sending…' : 'Send enquiry'}
        </button>
      </div>

      <div role="status" aria-live="polite">
        {status === 'success' && (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800 ring-1 ring-green-200">
            Thanks — your enquiry has been sent. We'll be in touch shortly to arrange your free consultation.
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
