export function getSecrets(): { jwt: string; pepper: string } {
  const jwt = process.env.JWT_SECRET ?? '';
  const pepper = process.env.OTP_PEPPER ?? '';
  if (jwt.length < 32 || pepper.length < 16) {
    throw new Error('JWT_SECRET (حداقل ۳۲ نویسه) و OTP_PEPPER (حداقل ۱۶ نویسه) را در .env تنظیم کنید');
  }
  return { jwt, pepper };
}
