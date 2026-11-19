import { todayInTehran } from '@fulad/shared';

export default function Home() {
  return (
    <main>
      <h1>فولاد</h1>
      <p>وب اعضا و پنل ادمین. امروز (تهران): {todayInTehran()}</p>
    </main>
  );
}
