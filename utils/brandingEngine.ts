import type { FontPairing, SchoolBranding } from '../types';

function adjustHexBrightness(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(15, 76, 129, ${alpha})`;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const FONT_STACKS: Record<FontPairing, string> = {
  jakarta: "'Plus Jakarta Sans', system-ui, sans-serif",
  outfit: "'Outfit', system-ui, sans-serif",
  bricolage: "'Bricolage Grotesque', system-ui, sans-serif",
};

export function applyBrandingToDocument(branding: SchoolBranding): void {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', branding.primaryColor);
  root.style.setProperty('--brand-primary-hover', adjustHexBrightness(branding.primaryColor, -18));
  root.style.setProperty('--brand-soft', hexToRgba(branding.primaryColor, 0.1));
  root.style.setProperty('--brand-accent', branding.accentColor);
  root.style.setProperty('--font-display', FONT_STACKS[branding.fontPairing] || FONT_STACKS.jakarta);

  document.title = `${branding.schoolName} — Academic & LMS Portal`;
}

export interface BrandPreset {
  id: string;
  label: string;
  branding: Partial<SchoolBranding>;
}

export const WHITE_LABEL_PRESETS: BrandPreset[] = [
  {
    id: 'mustafai',
    label: 'Mustafai School System',
    branding: {
      schoolName: 'Mustafai School System',
      tagline: 'Excellence in Character, Science & Digital Learning',
      affiliationCode: 'REG-MSS-2026',
      currencySymbol: '$',
      primaryColor: '#0F4C81',
      accentColor: '#D97706',
      crestStyle: 'shield',
      fontPairing: 'jakarta',
      contactEmail: 'admissions@mustafaischool.edu',
      address: '14 Knowledge Avenue, Model Town Campus',
    },
  },
  {
    id: 'al-noor',
    label: 'Al-Noor STEM Academy',
    branding: {
      schoolName: 'Al-Noor STEM Academy',
      tagline: 'Cultivating Scientific Inquiry & Modern Scholarship',
      affiliationCode: 'FBISE-AN-409',
      currencySymbol: 'PKR ',
      primaryColor: '#065F46',
      accentColor: '#B45309',
      crestStyle: 'compass',
      fontPairing: 'outfit',
      contactEmail: 'registrar@alnoorstem.edu.pk',
      address: 'Sector F-8/3 Academic Enclave, Islamabad',
    },
  },
  {
    id: 'oakridge',
    label: 'Oakridge Prep International',
    branding: {
      schoolName: 'Oakridge Prep International',
      tagline: 'Global Curricula & Liberal Arts Leadership',
      affiliationCode: 'IB-OAK-8821',
      currencySymbol: '£',
      primaryColor: '#1E293B',
      accentColor: '#0284C7',
      crestStyle: 'pillars',
      fontPairing: 'bricolage',
      contactEmail: 'office@oakridgeprep.org',
      address: '210 Regent Heritage Lane, North Campus',
    },
  },
  {
    id: 'crescent',
    label: 'Crescent Horizon College',
    branding: {
      schoolName: 'Crescent Horizon College',
      tagline: 'Precision Learning from Foundation to Graduation',
      affiliationCode: 'KHDA-CHC-119',
      currencySymbol: 'AED ',
      primaryColor: '#7C2D12',
      accentColor: '#D97706',
      crestStyle: 'book',
      fontPairing: 'jakarta',
      contactEmail: 'portal@crescenthorizon.ae',
      address: 'Academic City Boulevard, Block C',
    },
  },
];
