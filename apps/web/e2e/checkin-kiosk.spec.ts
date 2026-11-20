import { expect, test } from '@playwright/test';
import { createMemberViaUi, loginAdmin } from './helpers';

/** کیوسک ورود: توکن QR عضو تازه از کارت او گرفته و اسکن می‌شود */
test('کیوسک: اسکن توکن QR و ثبت ورود', async ({ page }) => {
  await loginAdmin(page);
  await createMemberViaUi(page, 'کیوسک پلی‌رایت', '09129900046');

  // نمایش کارت QR و استخراج توکن از متن کارت
  await page.getByRole('button', { name: 'کارت QR' }).click();
  await expect(page.getByText('کارت ورود شما')).toBeVisible();
  const token = (await page.locator('p[dir="ltr"]').last().textContent()) ?? '';
  expect(token.length).toBeGreaterThan(10);

  // کیوسک: اسکن = تایپ توکن و ثبت
  await page.goto('/admin/checkin');
  await page.getByLabel('توکن QR').fill(token);
  await page.getByRole('button', { name: 'ثبت ورود' }).click();
  await expect(page.getByRole('heading', { name: 'کیوسک پلی‌رایت' })).toBeVisible();

  // ورود تکراری همان روز رد می‌شود
  await page.getByLabel('توکن QR').fill(token);
  await page.getByRole('button', { name: 'ثبت ورود' }).click();
  await expect(page.getByText('همین حالا داخل است').first()).toBeVisible();
});
