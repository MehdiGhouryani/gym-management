import { expect, test } from '@playwright/test';
import { loginAdmin, GYM_SLUG } from './helpers';

/** سایت عمومی باشگاه: معرفی، پلن‌ها و درخواست عضویت → سرنخ */
test('صفحه‌ی عمومی باشگاه seed رندر می‌شود', async ({ page }) => {
  await page.goto(`/${GYM_SLUG}`);
  await expect(page.getByRole('heading', { name: 'باشگاه فولاد' })).toBeVisible();
  await expect(page.getByText('یک‌ماهه').first()).toBeVisible();
  await expect(page.getByText('درخواست عضویت')).toBeVisible();
});

test('درخواست عضویت از سایت → سرنخ در پنل مدیر', async ({ page }) => {
  await page.goto(`/${GYM_SLUG}`);
  await page.getByLabel('نام و نام خانوادگی').fill('متقاضی سایت');
  await page.getByLabel('شماره موبایل').fill('09129900047');
  await page.getByRole('button', { name: 'درخواست عضویت' }).click();
  await expect(page.getByText('درخواست شما ثبت شد')).toBeVisible();

  // در پنل مدیر، سرنخ دیده می‌شود
  await loginAdmin(page);
  await page.goto('/admin/leads');
  await expect(page.getByText('متقاضی سایت').first()).toBeVisible();
  await expect(page.getByText('جدید').first()).toBeVisible();
});

test('پورتال عضو: ورود با کد پیامکی و کارت دیجیتال', async ({ page }) => {
  await page.goto(`/portal/${GYM_SLUG}`);
  // عضو seed: نگار احمدی (نزدیک انقضا)
  await page.getByLabel('شماره موبایل').fill('09121000001');
  await page.getByRole('button', { name: 'دریافت کد' }).click();
  await page.getByLabel('کد تأیید').fill('12345');
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page.getByText('نگار احمدی').first()).toBeVisible();
  await expect(page.getByText('کارت ورود شما')).toBeVisible();
  await expect(page.getByText('پلن فعلی: سه‌ماهه')).toBeVisible();
});
