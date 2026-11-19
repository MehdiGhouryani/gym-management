export const fontState = { loaded: false };

/** وزیرمتن از بسته‌ی npm «vazirmatn»؛ اگر فایل پیدا نشود، فونت سیستم می‌ماند و اپ خراب نمی‌شود */
export function loadFontMap(): Record<string, number> | null {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    return {
      Vazirmatn: require('vazirmatn/fonts/ttf/Vazirmatn-Regular.ttf'),
      'Vazirmatn-Bold': require('vazirmatn/fonts/ttf/Vazirmatn-Bold.ttf'),
    };
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    return null;
  }
}
