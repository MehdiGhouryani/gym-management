import { expect, test } from '@playwright/test';
import { createMemberViaUi, loginAdmin, MANAGER_PHONE } from './helpers';

test.describe('پنل مدیر', () => {
  test('ورود با کد پیامکی تا داشبورد', async ({ page }) => {
    await loginAdmin(page);
    // KPIهای داشبورد با داده‌ی seed رندر می‌شوند
    await expect(page.getByText('اعضای فعال').first()).toBeVisible();
    await expect(page.getByText('مطالبات').first()).toBeVisible();
  });

  test('فهرست اعضای seed و جستجو', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/members');
    await expect(page.getByText('نگار احمدی').first()).toBeVisible();
    await page.getByLabel('جستجوی عضو').fill('نگار');
    await expect(page.getByText('نگار احمدی').first()).toBeVisible();
    await expect(page.getByText('09121000001').first()).toBeVisible();
  });

  test('ثبت عضو جدید → پروفایل', async ({ page }) => {
    await loginAdmin(page);
    const phone = '09129900042';
    await createMemberViaUi(page, 'آزمون پلی‌رایت', phone);
    await expect(page.getByRole('heading', { name: /آزمون پلی‌رایت/ })).toBeVisible();
    // عضو تازه بدون اشتراک: نشان «بدون اشتراک»
    await expect(page.getByText('بدون اشتراک').first()).toBeVisible();
    void MANAGER_PHONE;
  });

  test('تمدید اشتراک با پرداخت کامل', async ({ page }) => {
    await loginAdmin(page);
    await createMemberViaUi(page, 'تمدید پلی‌رایت', '09129900043');
    await page.getByRole('button', { name: 'تمدید اشتراک' }).click();
    // اولین پلن فعال (یک‌ماهه — مرتب‌شده بر اساس مدت)
    await page.getByLabel('پلن').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'ثبت تمدید' }).click();
    // پایان اشتراک در پروفایل ظاهر می‌شود
    await expect(page.getByText('پایان اشتراک').first()).toBeVisible();
    await expect(page.getByText('فعال').first()).toBeVisible();
  });

  test('بدهی و تسویه: پرداخت صفر → بدهی → پرداخت بدهی', async ({ page }) => {
    await loginAdmin(page);
    await createMemberViaUi(page, 'بدهکار پلی‌رایت', '09129900044');
    await page.getByRole('button', { name: 'تمدید اشتراک' }).click();
    await page.getByLabel('پلن').selectOption({ index: 1 });
    // پرداخت صفر → بدهی
    await page.getByLabel('مبلغ دریافتی (تومان)').fill('0');
    await page.getByRole('button', { name: 'ثبت تمدید' }).click();
    await expect(page.getByRole('button', { name: 'پرداخت بدهی' })).toBeVisible();
    await expect(page.getByText('بدهکار پلی‌رایت').first()).toBeVisible();
    await page.getByRole('button', { name: 'پرداخت بدهی' }).click();
    await page.getByLabel('روش پرداخت').selectOption({ label: 'نقدی' });
    await page.getByRole('button', { name: 'ثبت پرداخت' }).click();
    // بدهی صفر شد
    await expect(page.getByText('تسویه').first()).toBeVisible();
  });

  test('ثبت ورود دستی و کارت QR', async ({ page }) => {
    await loginAdmin(page);
    await createMemberViaUi(page, 'حضور پلی‌رایت', '09129900045');
    await page.getByRole('button', { name: 'ثبت ورود دستی' }).click();
    await expect(page.getByText('دستی').first()).toBeVisible();
    await page.getByRole('button', { name: 'کارت QR' }).click();
    await expect(page.getByText('کارت ورود شما')).toBeVisible();
  });
});
