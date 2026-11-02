import { Suspense } from 'react';
import { AuthenticationPage } from '@/components/account/authentication-page';
export default function LoginPage() {
  return (
    <Suspense>
      <AuthenticationPage />
    </Suspense>
  );
}
