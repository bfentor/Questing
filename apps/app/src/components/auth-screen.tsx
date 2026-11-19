import type { AuthResult } from '@sidequest/api';
import { Link, router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/auth/auth-provider';
import { AuthForm, type AuthFormHandle } from '@/components/auth-form';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { DateTimeField } from '@/components/date-time-field';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { toIsoDate } from '@/lib/dates';
import { authErrorMessage } from '@/lib/errors';
import { goBack } from '@/lib/navigation';

export type AuthMode = 'sign-in' | 'sign-up';

// Nobody this young can sign up anyway; the API checks the real minimum age.
const LATEST_BIRTH_DATE = new Date(2020, 0, 1);

// Password managers take the email for the account's username. On the web, "off" keeps the
// browser from also listing every email ever typed here; password managers fill it regardless.
const EMAIL_AUTOCOMPLETE = Platform.OS === 'web' ? 'off' : 'username';

function messageFor(result: AuthResult, t: TFunction) {
  switch (result.status) {
    case 'error':
      return authErrorMessage(result.errors, t);
    case 'pending':
      return result.flows.includes('verify_email') ? t('auth.verifyEmail') : t('auth.moreSteps');
    default:
      return null;
  }
}

/** The sign-in and sign-up forms, each at its own address: /sign-in and /sign-up. */
export function AuthScreen({ mode }: { mode: AuthMode }) {
  const { signIn, signUp } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  // A plausible starting point for the birth date picker; people adjust it.
  const [birthDate, setBirthDate] = useState(() => new Date(2005, 0, 1));
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const form = useRef<AuthFormHandle>(null);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    const result =
      mode === 'sign-in'
        ? await signIn({ email, password })
        : await signUp({
            email,
            password,
            display_name: displayName,
            handle,
            birth_date: toIsoDate(birthDate),
            accept_terms: acceptTerms,
          });
    setSubmitting(false);
    if (result.status === 'authenticated') {
      goBack();
    } else if (result.status === 'pending' && result.flows.includes('verify_email')) {
      router.replace('/verify-email');
    } else if (result.status === 'pending' && result.flows.includes('mfa_authenticate')) {
      router.replace('/two-factor');
    } else {
      setMessage(messageFor(result, t));
    }
  }

  return (
    <Screen hasHeader keyboardShouldPersistTaps="handled">
      <ThemedText type="subtitle">
        {mode === 'sign-in' ? t('auth.signInTitle') : t('auth.signUpTitle')}
      </ThemedText>
      <AuthForm ref={form} onSubmit={submit}>
        {mode === 'sign-up' ? (
          <>
            <TextField
              id="sign-up-name"
              label={t('auth.name')}
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
              textContentType="name"
              maxLength={80}
            />
            <View style={styles.field}>
              <TextField
                id="sign-up-username"
                label={t('auth.username')}
                value={handle}
                // Handles are lowercase and shown after an @, so neither needs typing.
                onChangeText={(text) => setHandle(text.replace(/^@/, '').toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                maxLength={30}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {t('auth.usernameHint')}
              </ThemedText>
            </View>
          </>
        ) : null}
        <TextField
          id="sign-in-email"
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={EMAIL_AUTOCOMPLETE}
          keyboardType="email-address"
          textContentType="username"
        />
        <TextField
          id="sign-in-password"
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
          onSubmitEditing={() => form.current?.submit()}
        />
        {mode === 'sign-up' ? (
          <>
            <DateTimeField
              label={t('auth.birthDate')}
              mode="date"
              value={birthDate}
              onChange={setBirthDate}
              maximumDate={LATEST_BIRTH_DATE}
            />
            <Checkbox
              checked={acceptTerms}
              onChange={setAcceptTerms}
              accessibilityLabel={t('auth.acceptTermsShort')}
              label={
                <ThemedText type="small">
                  {t('auth.acceptTermsStart')}
                  <Link href={{ pathname: '/legal/[document]', params: { document: 'terms' } }}>
                    <ThemedText type="small" themeColor="tint">
                      {t('auth.termsLink')}
                    </ThemedText>
                  </Link>
                  {t('auth.acceptTermsAnd')}
                  <Link href={{ pathname: '/legal/[document]', params: { document: 'privacy' } }}>
                    <ThemedText type="small" themeColor="tint">
                      {t('auth.privacyLink')}
                    </ThemedText>
                  </Link>
                  .
                </ThemedText>
              }
            />
          </>
        ) : null}
        {message ? <ThemedText themeColor="danger">{message}</ThemedText> : null}
        <Button
          title={mode === 'sign-in' ? t('common.signIn') : t('auth.signUp')}
          onPress={() => form.current?.submit()}
          loading={submitting}
          disabled={
            !email ||
            !password ||
            (mode === 'sign-up' && (!acceptTerms || !displayName.trim() || !handle))
          }
        />
      </AuthForm>
      {mode === 'sign-in' ? (
        <Link href="/forgot-password">
          <ThemedText type="small" themeColor="tint">
            {t('auth.forgotPassword')}
          </ThemedText>
        </Link>
      ) : null}
      <Button
        variant="secondary"
        title={mode === 'sign-in' ? t('auth.switchToSignUp') : t('auth.switchToSignIn')}
        // Replace rather than push, so going back leaves the form for where signing in started.
        onPress={() => router.replace(mode === 'sign-in' ? '/sign-up' : '/sign-in')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
});
