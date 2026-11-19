import { Redirect, useLocalSearchParams } from 'expo-router';

import { AuthScreen } from '@/components/auth-screen';

export default function SignInScreen() {
  // Links from before sign-up had its own address.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  if (mode === 'sign-up') {
    return <Redirect href="/sign-up" />;
  }
  return <AuthScreen mode="sign-in" />;
}
