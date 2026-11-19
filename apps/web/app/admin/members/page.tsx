import { Suspense } from 'react';
import { Skeleton } from '../../../src/ui/index';
import { MembersList } from '../../../src/features/members-list';

export default function MembersPage() {
  return (
    <Suspense fallback={<Skeleton height={300} radius={13} />}>
      <MembersList />
    </Suspense>
  );
}
