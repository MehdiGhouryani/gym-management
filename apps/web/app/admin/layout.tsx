import type { ReactNode } from 'react';
import { AdminShell } from '../../src/ui/admin-shell';
import { SessionProvider } from '../../src/lib/session';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
