// توکن‌های طراحی؛ همان مقدارهای نمونه‌ی HTML تأییدشده
export const colors = {
  light: {
    bg: '#EEF0EA', card: '#FFFFFF', ink: '#15231E', muted: '#5F6F68', line: '#D5DBD3',
    primary: '#1F4D3F', tint: '#DCE8E1',
    ok: '#2E7D57', okTint: '#E1F0E7', warn: '#9A6400', warnTint: '#FBEFD0',
    bad: '#B8402B', badTint: '#F7DDD7', debt: '#6B4B9A', debtTint: '#E9E1F4', signal: '#F2B134',
  },
  dark: {
    bg: '#0F1512', card: '#18221E', ink: '#E9EFEB', muted: '#9AA8A1', line: '#2B3832',
    primary: '#3A8F6B', tint: '#1F3A2F',
    ok: '#6FCB9B', okTint: '#1C3328', warn: '#E3B04B', warnTint: '#3A2F14',
    bad: '#EE8C79', badTint: '#3D2220', debt: '#B79CE3', debtTint: '#2B2340', signal: '#F2B134',
  },
} as const;

export const radius = { sm: 8, md: 13, lg: 22, xl: 26 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 32 } as const;
/** حداقل اندازه‌ی هدف لمسی (پیکسل) */
export const touchTarget = 44;
export const fontFamily = 'Vazirmatn';

/** حرکت: کوتاه، هدفمند و کنترل‌شده */
export const motion = {
  fastMs: 120, baseMs: 180, slowMs: 260,
  ease: 'cubic-bezier(.2,.8,.2,1)',
} as const;

/** سایه‌ها به‌صورت رشته‌ی CSS؛ برای موبایل از Shadow-Elevation معادل استفاده شود */
export const shadow = {
  sm: '0 1px 2px rgba(21,35,30,.08)', md: '0 4px 14px rgba(21,35,30,.10)', lg: '0 14px 40px rgba(21,35,30,.16)',
} as const;

export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

/** لایه‌بندی: هرچه پایین‌تر در فهرست، بالاتر روی صفحه */
export const z = { sticky: 20, overlay: 30, modal: 40, toast: 50 } as const;
