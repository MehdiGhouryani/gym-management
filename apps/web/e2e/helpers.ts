import { expect, type Page } from '@playwright/test';

export const MANAGER_PHONE = '09120000001';
export const OTP_CODE = '12345';
export const GYM_SLUG = 'fulad';

/** ورود مدیر از رابط کاربری */
export async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/admin');
  await page.waitForURL(/\/admin\/login/);
  await page.getByLabel('شماره موبایل').fill(MANAGER_PHONE);
  await page.getByRole('button', { name: 'دریافت کد' }).click();
  await page.getByLabel('کد تأیید').fill(OTP_CODE);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await page.waitForURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'داشبورد' })).toBeVisible();
}

/** ثبت عضو تازه از رابط کاربری و بازگشت به پروفایل */
export async function createMemberViaUi(page: Page, name: string, phone: string): Promise<void> {
  await page.goto('/admin/members');
  await page.getByRole('link', { name: '+ عضو جدید' }).first().click();
  await page.waitForURL(/\/admin\/members\/new/);
  await page.getByLabel('نام و نام خانوادگی').fill(name);
  await page.getByLabel('شماره موبایل').fill(phone);
  await page.getByRole('button', { name: 'ذخیره عضو' }).click();
  await page.waitForURL(/\/admin\/members\/[0-9a-f-]{36}$/);
}
