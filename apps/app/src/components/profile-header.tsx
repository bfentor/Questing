import type { Profile } from '@questing/api';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShape } from '@/hooks/use-shape';

import { Avatar } from './avatar';
import { MapPattern } from './map-pattern';
import { RemoteImage } from './remote-image';
import { ThemedText } from './themed-text';

/**
 * Their gender, as shown on the profile: the API only sends it when they show it (or it's
 * your own). Not for "prefer not to say".
 */
function useGenderLabel(profile: Profile) {
  const { t } = useTranslation();
  switch (profile.gender) {
    case 'woman':
      return t('editProfile.genderShortWoman');
    case 'man':
      return t('editProfile.genderShortMan');
    case 'nonbinary':
      return t('editProfile.genderNonbinary');
    case 'other':
      return profile.gender_other || t('editProfile.genderOther');
    default:
      return null;
  }
}

type ProfileHeaderProps = {
  profile: Profile;
  /** Small buttons beside the profile picture: Follow or Edit profile, then a "…" menu. */
  actions?: ReactNode;
};

export function ProfileHeader({ profile, actions }: ProfileHeaderProps) {
  const shape = useShape();
  const { t } = useTranslation();
  const theme = useTheme();
  const details = [
    profile.student_of ? t('student.badge', { university: profile.student_of.short_name }) : null,
    useGenderLabel(profile),
    profile.pronouns,
  ].filter(Boolean);

  return (
    <View style={styles.header}>
      {profile.cover ? (
        <RemoteImage
          image={profile.cover}
          style={[styles.cover, shape.picture]}
          contentFit="cover"
        />
      ) : (
        // No cover yet: a scrap of map instead of a blank box.
        <MapPattern style={[styles.cover, shape.picture, styles.coverEmpty]} />
      )}
      <View style={styles.avatarRow}>
        {/* A ring in the page colour, so the picture stands out where it overlaps the cover. */}
        <View style={[styles.avatarRing, { backgroundColor: theme.background }]}>
          <Avatar name={profile.display_name} image={profile.avatar} size={88} />
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      <View>
        <View style={styles.nameRow}>
          <ThemedText type="heading">{profile.display_name}</ThemedText>
          {profile.verified ? (
            <SymbolView
              name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
              size={20}
              tintColor={theme.tint}
              accessibilityLabel={t('profile.verified')}
            />
          ) : null}
        </View>
        <ThemedText themeColor="textSecondary">@{profile.handle}</ThemedText>
      </View>
      {details.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          {details.join(' · ')}
        </ThemedText>
      ) : null}
      {profile.bio ? <ThemedText>{profile.bio}</ThemedText> : null}
      <Links profile={profile} />
      <View style={styles.stats}>
        <Link
          href={{ pathname: '/profiles/[handle]/followers', params: { handle: profile.handle } }}>
          <ThemedText type="small">
            {t('profile.followers', { count: profile.follower_count })}
          </ThemedText>
        </Link>
        <Link
          href={{ pathname: '/profiles/[handle]/following', params: { handle: profile.handle } }}>
          <ThemedText type="small">
            {t('profile.following', { count: profile.following_count })}
          </ThemedText>
        </Link>
      </View>
    </View>
  );
}

/** An organization's website and Instagram; people's profiles don't have them. */
function Links({ profile }: { profile: Profile }) {
  if (profile.kind !== 'organization') {
    return null;
  }
  const links = [
    profile.website
      ? { label: profile.website.replace(/^https?:\/\//, ''), url: profile.website }
      : null,
    profile.instagram
      ? {
          label: `Instagram: @${profile.instagram}`,
          url: `https://instagram.com/${profile.instagram}`,
        }
      : null,
  ].filter((link) => link !== null);

  if (links.length === 0) {
    return null;
  }
  return (
    <View style={styles.links}>
      {links.map((link) => (
        <Pressable key={link.url} role="link" onPress={() => Linking.openURL(link.url)}>
          <ThemedText type="small" themeColor="tint">
            {link.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.two,
  },
  cover: {
    width: '100%',
    aspectRatio: 3,
  },
  coverEmpty: {
    aspectRatio: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
    // Half the picture (and its ring) overlaps the cover.
    marginTop: -48 - Spacing.two,
    paddingLeft: Spacing.two,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
