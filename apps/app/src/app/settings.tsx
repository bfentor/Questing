import {
  meBlockedListOptions,
  meMutedListOptions,
  meSettingsPartialUpdate,
  meSettingsRetrieveOptions,
  meSettingsRetrieveQueryKey,
  type AccountSettings,
  type PatchedAccountSettingsRequest,
  profilesBlockDestroyMutation,
  profilesMuteDestroyMutation,
  type ProfileSummary,
} from '@questing/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { AccountSection } from '@/components/account-section';
import { BuildInfo } from '@/components/build-info';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { CredentialsSection } from '@/components/credentials-section';
import { SecuritySection } from '@/components/security-section';
import { StudentSection } from '@/components/student-section';
import { Switch } from '@/components/switch';
import { ProfileRow } from '@/components/profile-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';
import { chooseLanguage, LANGUAGES, storedLanguage, type Language } from '@/i18n';
import { setAppearance, useAppearance, type Appearance } from '@/lib/appearance';
import { goBack } from '@/lib/navigation';

export default function SettingsScreen() {
  const { status, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <Screen hasHeader>
      <LanguagePicker />
      <AppearancePicker />
      <View style={styles.section}>
        <ThemedText type="heading">{t('legal.about')}</ThemedText>
        <Link href={{ pathname: '/legal/[document]', params: { document: 'terms' } }}>
          <ThemedText themeColor="tint">{t('legal.terms')}</ThemedText>
        </Link>
        <Link href={{ pathname: '/legal/[document]', params: { document: 'privacy' } }}>
          <ThemedText themeColor="tint">{t('legal.privacy')}</ThemedText>
        </Link>
        <BuildInfo />
        {__DEV__ ? (
          // Development builds only, so English only.
          <Link href="/theme-lab">
            <ThemedText themeColor="tint">Theme lab</ThemedText>
          </Link>
        ) : null}
      </View>
      {status === 'signed-in' ? (
        <>
          <PushSettings />
          <NearbySettings />
          <EmailSettings />
          <BlockedAndMuted />
          <StudentSection />
          <CredentialsSection />
          <SecuritySection />
          <AccountSection />
          <Button
            title={t('common.signOut')}
            variant="secondary"
            onPress={async () => {
              await signOut();
              goBack('/');
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

const PUSH_KINDS = [
  'new_follower',
  'follow_request',
  'follow_accepted',
  'organization_invite',
  'new_event',
  'new_post',
  'nearby_events',
  'interest_events',
  'event_changed',
  'event_cancelled',
  'event_postponed',
  'co_host_invite',
  'event_reminder',
  'feedback_request',
  'waitlist_promoted',
  'announcement',
  'mention',
  'comment',
  'reaction',
] as const;

function PushSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery(meSettingsRetrieveOptions());
  const update = useMutation({
    mutationFn: async (push: Record<string, boolean>) =>
      (await meSettingsPartialUpdate({ body: { push }, throwOnError: true })).data,
    onSuccess: (settings) =>
      queryClient.setQueryData<AccountSettings>(meSettingsRetrieveQueryKey(), settings),
  });

  if (!data?.push) {
    return null;
  }

  return (
    <View style={styles.section}>
      <ThemedText type="heading">{t('settings.pushTitle')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('settings.pushHint')}
      </ThemedText>
      {PUSH_KINDS.map((kind) => (
        <View key={kind} style={styles.switchRow}>
          <ThemedText style={styles.switchLabel}>{t(`settings.pushKinds.${kind}`)}</ThemedText>
          <Switch
            value={data.push?.[kind] ?? true}
            onValueChange={(enabled) => update.mutate({ [kind]: enabled })}
            accessibilityLabel={t(`settings.pushKinds.${kind}`)}
          />
        </View>
      ))}
    </View>
  );
}

const NEARBY_RADII_KM = [5, 10, 25];

/**
 * Opt-in "N new events near you" notifications: sharing roughly where you are (the API keeps
 * it to about a kilometre) and how far to look. Turning it off forgets the place.
 */
function NearbySettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery(meSettingsRetrieveOptions());
  const [problem, setProblem] = useState<'denied' | 'failed' | null>(null);
  const update = useMutation({
    mutationFn: async (body: PatchedAccountSettingsRequest) =>
      (await meSettingsPartialUpdate({ body, throwOnError: true })).data,
    onSuccess: (settings) =>
      queryClient.setQueryData<AccountSettings>(meSettingsRetrieveQueryKey(), settings),
  });
  const locate = useMutation({
    mutationFn: async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) throw new Error('denied');
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: coords.latitude, lng: coords.longitude };
    },
    onMutate: () => setProblem(null),
    onSuccess: (nearby_location) => update.mutate({ nearby_location }),
    onError: (error) => setProblem(error.message === 'denied' ? 'denied' : 'failed'),
  });

  if (!data) {
    return null;
  }
  const on = Boolean(data.nearby_location);

  return (
    <View style={styles.section}>
      <ThemedText type="heading">{t('settings.nearbyTitle')}</ThemedText>
      <View style={styles.switchRow}>
        <ThemedText style={styles.switchLabel}>{t('settings.nearbyToggle')}</ThemedText>
        <Switch
          value={on || locate.isPending}
          onValueChange={(enabled) =>
            enabled ? locate.mutate() : update.mutate({ nearby_location: null })
          }
          accessibilityLabel={t('settings.nearbyToggle')}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {t('settings.nearbyHint')}
      </ThemedText>
      {problem ? (
        <ThemedText type="small" themeColor="danger">
          {t(problem === 'denied' ? 'settings.nearbyDenied' : 'settings.nearbyFailed')}
        </ThemedText>
      ) : null}
      {on ? (
        <>
          <ThemedText type="smallBold">{t('settings.nearbyRadius')}</ThemedText>
          <View style={styles.chips} role="radiogroup" aria-label={t('settings.nearbyRadius')}>
            {NEARBY_RADII_KM.map((km) => (
              <Chip
                key={km}
                radio
                label={`${km} km`}
                selected={data.nearby_radius_km === km}
                onPress={() => update.mutate({ nearby_radius_km: km })}
              />
            ))}
          </View>
          <Pressable role="button" onPress={() => locate.mutate()} disabled={locate.isPending}>
            <ThemedText type="small" themeColor="tint">
              {t('settings.nearbyUpdate')}
            </ThemedText>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function EmailSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery(meSettingsRetrieveOptions());
  const update = useMutation({
    mutationFn: async (email_digest: boolean) =>
      (await meSettingsPartialUpdate({ body: { email_digest }, throwOnError: true })).data,
    onSuccess: (settings) =>
      queryClient.setQueryData<AccountSettings>(meSettingsRetrieveQueryKey(), settings),
  });

  if (!data) {
    return null;
  }

  return (
    <View style={styles.section}>
      <ThemedText type="heading">{t('settings.emailTitle')}</ThemedText>
      <View style={styles.switchRow}>
        <ThemedText style={styles.switchLabel}>{t('settings.emailDigest')}</ThemedText>
        <Switch
          value={data.email_digest ?? false}
          onValueChange={(enabled) => update.mutate(enabled)}
          accessibilityLabel={t('settings.emailDigest')}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {t('settings.emailDigestHint')}
      </ThemedText>
    </View>
  );
}

function BlockedAndMuted() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const blocked = useQuery(meBlockedListOptions());
  const muted = useQuery(meMutedListOptions());
  const onSuccess = () => queryClient.invalidateQueries();
  const unblock = useMutation({ ...profilesBlockDestroyMutation(), onSuccess });
  const unmute = useMutation({ ...profilesMuteDestroyMutation(), onSuccess });

  return (
    <>
      <ProfileSection
        title={t('moderation.blockedAccounts')}
        emptyText={t('moderation.noneBlocked')}
        profiles={blocked.data}
        actionLabel={t('moderation.unblock')}
        onAction={(handle) => unblock.mutate({ path: { handle } })}
      />
      <ProfileSection
        title={t('moderation.mutedAccounts')}
        emptyText={t('moderation.noneMuted')}
        profiles={muted.data}
        actionLabel={t('moderation.unmute')}
        onAction={(handle) => unmute.mutate({ path: { handle } })}
      />
    </>
  );
}

type ProfileSectionProps = {
  title: string;
  emptyText: string;
  profiles: ProfileSummary[] | undefined;
  actionLabel: string;
  onAction: (handle: string) => void;
};

function ProfileSection({
  title,
  emptyText,
  profiles,
  actionLabel,
  onAction,
}: ProfileSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="heading">{title}</ThemedText>
      {profiles?.length === 0 ? (
        <ThemedText themeColor="textSecondary">{emptyText}</ThemedText>
      ) : null}
      {profiles?.map((profile) => (
        <ProfileRow
          key={profile.handle}
          profile={profile}
          action={
            <Button
              title={actionLabel}
              variant="secondary"
              onPress={() => onAction(profile.handle)}
            />
          }
        />
      ))}
    </View>
  );
}

function LanguagePicker() {
  const shape = useShape();
  const { t } = useTranslation();
  const theme = useTheme();
  // undefined while loading, null when following the device
  const [choice, setChoice] = useState<Language | null | undefined>(undefined);

  useEffect(() => {
    storedLanguage().then(setChoice);
  }, []);

  const options: { code: Language | null; name: string }[] = [
    { code: null, name: t('settings.languageAutomatic') },
    ...LANGUAGES,
  ];

  return (
    <View style={styles.section}>
      <ThemedText type="heading">{t('settings.language')}</ThemedText>
      <ThemedView type="backgroundElement" style={[styles.group, shape.box]}>
        {options.map((option) => {
          const selected = choice !== undefined && option.code === choice;
          return (
            <Pressable
              key={option.code ?? 'automatic'}
              role="radio"
              aria-checked={selected}
              onPress={() => {
                setChoice(option.code);
                chooseLanguage(option.code);
              }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
              <ThemedText style={selected && { color: theme.tint }}>{option.name}</ThemedText>
              {selected ? <ThemedText style={{ color: theme.tint }}>✓</ThemedText> : null}
            </Pressable>
          );
        })}
      </ThemedView>
    </View>
  );
}

function AppearancePicker() {
  const shape = useShape();
  const { t } = useTranslation();
  const theme = useTheme();
  const appearance = useAppearance();
  const options: { value: Appearance; name: string }[] = [
    { value: 'system', name: t('settings.languageAutomatic') },
    { value: 'light', name: t('settings.appearanceLight') },
    { value: 'dark', name: t('settings.appearanceDark') },
  ];

  return (
    <View style={styles.section}>
      <ThemedText type="heading">{t('settings.appearance')}</ThemedText>
      <ThemedView type="backgroundElement" style={[styles.group, shape.box]}>
        {options.map((option) => {
          const selected = option.value === appearance;
          return (
            <Pressable
              key={option.value}
              role="radio"
              aria-checked={selected}
              onPress={() => setAppearance(option.value)}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
              <ThemedText style={selected && { color: theme.tint }}>{option.name}</ThemedText>
              {selected ? <ThemedText style={{ color: theme.tint }}>✓</ThemedText> : null}
            </Pressable>
          );
        })}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  group: {
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchLabel: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
