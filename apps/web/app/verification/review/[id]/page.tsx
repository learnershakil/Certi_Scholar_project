'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LegacyReviewRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/officer/review/${id}`);
    } else {
      router.replace('/officer');
    }
  }, [id, router]);

  return null;
}
