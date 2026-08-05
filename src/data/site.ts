// Central place for content shared across multiple components/pages.
// Editing here updates the navbar, footer, and any page that reuses these lists.

export const SITE = {
  name: 'MA Utility Solutions',
  url: 'https://mautilitysolutions.co.uk',
  email: 'hello@mautilitysolutions.co.uk',
  complaintsEmail: 'complaints@mautilitysolutions.co.uk',
  phone: '+44 1234 567890',
  phoneHref: 'tel:+441234567890',
  tagline: 'Independent whole-of-market brokerage for energy, water, solar and trades.',
};

export const PRIMARY_NAV = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Solar', href: '/solar' },
  { label: 'Utilities', href: '/utilities' },
  { label: 'Fixtures', href: '/fixtures' },
];

export const FOOTER_PAGES = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Solar', href: '/solar' },
  { label: 'Utilities', href: '/utilities' },
  { label: 'Fixtures', href: '/fixtures' },
  { label: 'Contact', href: '/contact' },
  { label: 'Feedback', href: '/feedback' },
];

export const COMPLIANCE_LINKS = [
  { label: 'Complaints Procedure', href: '/complaints' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
];

export const TRADES = [
  'Carpenters',
  'Plumbers',
  'Electricians',
  'Painters',
  'Roofers',
  'Tilers',
  'Plasterers',
  'Groundworkers',
  'General Builders',
];

export const SERVICE_OPTIONS = ['Solar', 'Electricity', 'Gas', 'Water', 'Fixtures'];
