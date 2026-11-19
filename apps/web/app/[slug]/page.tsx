// فاز ۴: صفحه‌ی عمومی باشگاه (SSR یا ISR)
export default async function GymPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main>
      <h1>باشگاه {slug}</h1>
      <p>این صفحه در فاز ۴ ساخته می‌شود.</p>
    </main>
  );
}
