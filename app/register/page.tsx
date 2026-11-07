import { Suspense } from 'react';
import { AuthenticationPage } from '@/components/account/authentication-page';
export default function RegisterPage() {
  return (
    <Suspense>
      <AuthenticationPage initialMode="register" />
    </Suspense>
  );
}
