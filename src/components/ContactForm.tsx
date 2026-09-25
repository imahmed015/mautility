import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { SERVICE_OPTIONS, SITE } from '../data/site';
import { useTurnstile } from '../hooks/useTurnstile';

type CustomerType = '' | 'home' | 'business';

type FormState = {
  customerType: CustomerType;
  businessName: string;
  fullName: string;
  email: string;
  phone: string;
  postcode: string;
  services: string[];
  currentSupplier: string;
  contractEnd: string;
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

const CUSTOMER_TYPES: { value: Exclude<CustomerType, ''>; label: string }[] = [
  { value: 'home', label: 'My home' },
  { value: 'business', label: 'A business' },
];

// Services with a supplier contract — the supplier/contract-end fields and the "have a
// bill ready" tip only apply to these (not to solar or fixtures enquiries).
const CONTRACT_SERVICES = ['Electricity', 'Gas', 'Water'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Standard UK postcode pattern (covers all current formats, e.g. SW1A 1AA, M1 1AE, B33 8TH, CR2 6XH, DN55 1PT).
// The outer (?:...) group matters: without it, ^ only applied to the GIR 0AA branch and
// $ only to the main branch, so e.g. "not a postcode YO31 7EX" passed validation.
const UK_POSTCODE_REGEX =
  /^(?:([Gg][Ii][Rr] ?0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2}))$/i;

const INITIAL_STATE: FormState = {
  customerType: '',
  businessName: '',
  fullName: '',
  email: '',
  phone: '',
  postcode: '',
  services: [],
  currentSupplier: '',
  contractEnd: '',
  concern: '',
  callTime: '',
  message: '',
};

const hasContractService = (services: string[]) => services.some((s) => CONTRACT_SERVICES.includes(s));

// On-screen order of validated fields (they match each input's `name`), used to move
// focus to the first one with an error after a failed submit.
const FIELD_ORDER: (keyof FormState)[] = [
  'customerType',
  'fullName',
  'email',
  'phone',
  'postcode',
  'services',
  'concern',
  'callTime',
];

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.customerType) {
    errors.customerType = 'Please tell us whether this is for your home or a business.';
  }

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
  // What was just sent — the form resets on success, so the success message reads from this.
  const [submitted, setSubmitted] = useState<Pick<FormState, 'customerType' | 'services'> | null>(null);
  const idPrefix = useId();
  const bookingsUrl = import.meta.env.PUBLIC_BOOKINGS_URL;
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstError = useRef(false);

  // After a failed submit, move focus to the first invalid field. Done after render (not
  // in handleSubmit) so the error text and aria-describedby link already exist and a
  // screen reader announces the field together with its error.
  useEffect(() => {
    if (!focusFirstError.current) return;
    focusFirstError.current = false;
    const first = FIELD_ORDER.find((key) => errors[key]);
    const el = first ? formRef.current?.elements.namedItem(first) : null;
    // Radio/checkbox groups come back as a RadioNodeList — focus the first option.
    const target = el instanceof RadioNodeList ? el[0] : el;
    if (target instanceof HTMLElement) target.focus();
  }, [errors]);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const { token: turnstileToken, reset: resetTurnstile } = useTurnstile(
    turnstileRef,
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
  );

  // Pre-tick services passed from a service page's CTA, e.g. /contact?service=Solar or
  // ?service=Electricity,Gas. Runs after hydration (not in initial state) so the server-
  // rendered HTML and React's first render match. Unknown names are ignored.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('service');
    if (!requested) return;
    const wanted = requested.split(',').map((s) => s.trim().toLowerCase());
    const services = SERVICE_OPTIONS.filter((option) => wanted.includes(option.toLowerCase()));
    if (services.length) setValues((prev) => ({ ...prev, services }));
  }, []);

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
      focusFirstError.current = true;
      return;
    }

    // Basic spam trap: if the hidden honeypot field has been filled in (by a bot),
    // quietly no-op instead of submitting.
    if (honeypot) {
      setStatus('success');
      return;
    }

    // Submitting before the spam check has finished (or when it's blocked, e.g. by a
    // privacy extension) would just be rejected by Web3Forms with an unclear error.
    if (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setStatus('error');
      setServerMessage(
        `Please wait a moment for the security check to finish, then try again. If it keeps happening, email us at ${SITE.email}.`,
      );
      return;
    }

    setStatus('sending');
    setServerMessage('');

    try {
      const accessKey = import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY;
      const isBusiness = values.customerType === 'business';

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `New ${isBusiness ? 'business' : 'home'} enquiry — MA Utility Solutions website`,
          from_name: values.fullName,
          customer_type: isBusiness ? 'Business' : 'Home',
          ...(isBusiness && { business_name: values.businessName.trim() || '(not provided)' }),
          full_name: values.fullName,
          email: values.email,
          phone: values.phone,
          postcode: values.postcode,
          services_interested_in: values.services.join(', '),
          ...(hasContractService(values.services) && {
            current_supplier: values.currentSupplier.trim() || '(not provided)',
            contract_end_date: values.contractEnd.trim() || '(not provided)',
          }),
          main_concern: values.concern,
          best_time_to_call: values.callTime,
          message: values.message || '(no message provided)',
          'cf-turnstile-response': turnstileToken,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted({ customerType: values.customerType, services: values.services });
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
    } finally {
      resetTurnstile();
    }
  };

  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    // method/action are only a fallback for submits that happen before React hydrates (or if
    // it fails): without them the browser does a GET to this page, putting the visitor's
    // details in the URL and delivering nothing. With JS, handleSubmit's preventDefault()
    // means these are never used.
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="space-y-6"
      method="POST"
      action="https://api.web3forms.com/submit"
    >
      <input type="hidden" name="access_key" value={import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY} />
      <input type="hidden" name="subject" value="New enquiry — MA Utility Solutions website" />

      {/* Honeypot field — hidden from real users, left blank by them; bots tend to fill every field. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor={fieldId('botcheck')}>Leave this field blank</label>
        <input type="text" id={fieldId('botcheck')} name="botcheck" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Cloudflare Turnstile — spam protection. Rendered explicitly by the useTurnstile
          hook (see src/hooks/useTurnstile.ts) after hydration, not via the script's
          auto-scan, to avoid a DOM-mutation-vs-hydration race that breaks React. */}
      {import.meta.env.PUBLIC_TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}

      <fieldset aria-describedby={errors.customerType ? fieldId('customerType-error') : undefined}>
        <legend className="field-label">
          Is this for your home or a business? <span className="text-amber-ink">*</span>
        </legend>
        <div className="flex flex-wrap gap-3">
          {CUSTOMER_TYPES.map(({ value, label }) => {
            const radioId = fieldId(`type-${value}`);
            const checked = values.customerType === value;
            return (
              <label
                key={value}
                htmlFor={radioId}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  checked ? 'border-amber bg-amber/15 text-navy' : 'border-slate-300 text-ink-light hover:border-amber/60'
                }`}
              >
                <input
                  id={radioId}
                  type="radio"
                  name="customerType"
                  value={value}
                  checked={checked}
                  onChange={() => setField('customerType', value)}
                  className="h-4 w-4 border-slate-400 text-amber-dark focus:ring-amber"
                />
                {label}
              </label>
            );
          })}
        </div>
        {errors.customerType && (
          <p id={fieldId('customerType-error')} className="field-error">
            {errors.customerType}
          </p>
        )}
      </fieldset>

      {values.customerType === 'business' && (
        <div>
          <label htmlFor={fieldId('businessName')} className="field-label">
            Business name <span className="font-normal text-ink-light">(optional)</span>
          </label>
          <input
            id={fieldId('businessName')}
            name="businessName"
            type="text"
            autoComplete="organization"
            value={values.businessName}
            onChange={(e) => setField('businessName', e.target.value)}
            className="field-input"
          />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={fieldId('fullName')} className="field-label">
            Full Name <span className="text-amber-ink">*</span>
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
            Email <span className="text-amber-ink">*</span>
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
            Phone <span className="text-amber-ink">*</span>
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
            Postcode <span className="text-amber-ink">*</span>
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

      <fieldset aria-describedby={errors.services ? fieldId('services-error') : undefined}>
        <legend className="field-label">
          Services you're interested in <span className="text-amber-ink">*</span>
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
        {errors.services && (
          <p id={fieldId('services-error')} className="field-error">
            {errors.services}
          </p>
        )}
        {values.customerType === 'home' && values.services.includes('Water') && (
          <p className="mt-3 rounded-lg bg-amber/10 px-4 py-3 text-sm leading-relaxed text-navy ring-1 ring-amber/30">
            Just so you know: UK law doesn't allow households to switch water supplier, so our water service is
            for businesses only. We can still help with your other services.
          </p>
        )}
      </fieldset>

      {hasContractService(values.services) && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor={fieldId('currentSupplier')} className="field-label">
              Current supplier <span className="font-normal text-ink-light">(optional)</span>
            </label>
            <input
              id={fieldId('currentSupplier')}
              name="currentSupplier"
              type="text"
              placeholder="e.g. British Gas"
              value={values.currentSupplier}
              onChange={(e) => setField('currentSupplier', e.target.value)}
              className="field-input"
            />
          </div>

          <div>
            <label htmlFor={fieldId('contractEnd')} className="field-label">
              Contract end date <span className="font-normal text-ink-light">(if you know it)</span>
            </label>
            {/* Free text rather than type="month": Firefox and desktop Safari don't support
                month pickers, and "around March next year" is still useful to us. */}
            <input
              id={fieldId('contractEnd')}
              name="contractEnd"
              type="text"
              placeholder="e.g. March 2027"
              value={values.contractEnd}
              onChange={(e) => setField('contractEnd', e.target.value)}
              className="field-input"
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={fieldId('concern')} className="field-label">
            Main concern <span className="text-amber-ink">*</span>
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
            Best time to call <span className="text-amber-ink">*</span>
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
        <p className="mt-3 text-xs leading-relaxed text-ink-light">
          We'll use these details to respond to your enquiry. See our{' '}
          <a href="/privacy" className="font-semibold text-navy underline hover:text-amber-ink">
            Privacy Policy
          </a>{' '}
          for how we handle your data.
        </p>
      </div>

      <div role="status" aria-live="polite">
        {status === 'success' && (
          <div className="space-y-2 rounded-lg bg-green-50 px-4 py-3 text-sm leading-relaxed text-green-800 ring-1 ring-green-200">
            <p className="font-medium">
              Thanks — your enquiry has been sent. We'll get back to you within one working day, from {SITE.email}.
            </p>
            {submitted && hasContractService(submitted.services) && (
              <p>
                To make the call quicker, have a recent bill to hand — for electricity and gas it shows your meter
                numbers (MPAN/MPRN) — and your contract end date if you know it.
              </p>
            )}
            {submitted?.customerType === 'business' && bookingsUrl && (
              <p>
                Prefer to pick a time now?{' '}
                <a href={bookingsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                  Book your free consultation
                </a>{' '}
                (opens our Microsoft Bookings calendar).
              </p>
            )}
          </div>
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
