import {
  imagesCropCreate,
  imagesRetrieve,
  type Image,
  type PatchedProfileRequestWritable,
  type Profile,
} from '@sidequest/api';
import { useMutation } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import { useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';

import { ActionMenu, type MenuAction, type MenuAnchor } from './action-menu';
import { Avatar } from './avatar';
import { Button } from './button';
import { CategoryPicker } from './category-chips';
import { Chip } from './chip';
import { ImageCropper, type CropRect } from './image-cropper';
import { RemoteImage } from './remote-image';
import { Switch } from './switch';
import { TextField } from './text-field';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export type ProfileFieldErrors = Partial<Record<keyof PatchedProfileRequestWritable, string[]>>;

type ProfileFormProps = {
  profile: Profile;
  /** Private-account and visibility switches; people only. */
  showPrivacy?: boolean;
  /** Saves the changes; resolves to field errors if the API rejected them. */
  onSave: (body: PatchedProfileRequestWritable) => Promise<ProfileFieldErrors | null>;
  onSaved: () => void;
};

type PictureKind = 'avatar' | 'cover';
const ASPECT: Record<PictureKind, number> = { avatar: 1, cover: 3 };
const AVATAR_SIZE = 88;

/** A picture being framed: the whole one, which image to crop, and where it was framed. */
type Cropping = {
  kind: PictureKind;
  picture: { url: string; width: number; height: number };
  imageId: number;
  initial: CropRect | null;
};

/** Pictures, details, interests and privacy of a profile (a person's or an organization's). */
export function ProfileForm({ profile, showPrivacy, onSave, onSaved }: ProfileFormProps) {
  const { t } = useTranslation();
  const person = profile.kind === 'person';

  const [avatar, setAvatar] = useState<Image | null | undefined>(profile.avatar);
  const [cover, setCover] = useState<Image | null | undefined>(profile.cover);
  const [form, setForm] = useState({
    display_name: profile.display_name,
    handle: profile.handle,
    bio: profile.bio ?? '',
    pronouns: profile.pronouns ?? '',
    website: profile.website ?? '',
    instagram: profile.instagram ?? '',
  });
  const [interests, setInterests] = useState<string[]>(profile.interests ?? []);
  const [privacy, setPrivacy] = useState({
    is_private: profile.is_private ?? false,
    hide_followers: profile.hide_followers ?? false,
    hide_attendance: profile.hide_attendance ?? false,
  });
  const [errors, setErrors] = useState<ProfileFieldErrors>({});

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const { website, instagram, pronouns, ...common } = form;
      const body: PatchedProfileRequestWritable = {
        ...common,
        // People have pronouns; organizations have links.
        ...(person ? { pronouns: pronouns.trim() } : { website, instagram }),
        avatar_id: avatar?.id ?? null,
        cover_id: cover?.id ?? null,
        interests,
        ...(showPrivacy ? privacy : {}),
      };
      const fieldErrors = await onSave(body);
      if (fieldErrors) {
        setErrors(fieldErrors);
        throw new Error('invalid');
      }
    },
    onSuccess: onSaved,
  });

  const fieldErrors = (name: keyof ProfileFieldErrors) =>
    errors[name]?.map((message) => (
      <ThemedText key={message} type="small" themeColor="danger">
        {message}
      </ThemedText>
    ));

  const field = (name: keyof typeof form, label: string, extra?: object) => (
    <View>
      <TextField label={label} value={form[name]} onChangeText={set(name)} {...extra} />
      {fieldErrors(name)}
    </View>
  );

  return (
    <>
      <Pictures
        name={form.display_name}
        avatar={avatar}
        cover={cover}
        onAvatar={setAvatar}
        onCover={setCover}
      />

      {field('display_name', t('editProfile.displayName'))}
      {field('handle', t('editProfile.handle'), { autoCapitalize: 'none', autoCorrect: false })}
      {field('bio', t('editProfile.bio'), { multiline: true, maxLength: 500, style: styles.bio })}
      {person ? (
        <View style={styles.group}>
          <PronounPicker value={form.pronouns} onChange={set('pronouns')} />
          {fieldErrors('pronouns')}
        </View>
      ) : (
        <>
          {field('website', t('editProfile.website'), {
            autoCapitalize: 'none',
            keyboardType: 'url',
          })}
          {field('instagram', t('editProfile.instagram'), {
            autoCapitalize: 'none',
            autoCorrect: false,
          })}
        </>
      )}

      <View style={styles.group}>
        <ThemedText type="smallBold">{t('editProfile.interests')}</ThemedText>
        <CategoryPicker value={interests} onChange={setInterests} />
      </View>

      {showPrivacy ? (
        <View style={styles.privacy}>
          <ThemedText type="smallBold">{t('editProfile.privacy')}</ThemedText>
          {(
            [
              ['is_private', t('editProfile.isPrivate'), t('editProfile.isPrivateHint')],
              ['hide_followers', t('editProfile.hideFollowers'), null],
              ['hide_attendance', t('editProfile.hideAttendance'), null],
            ] as const
          ).map(([key, label, hint]) => (
            <View key={key} style={styles.switchRow}>
              <View style={styles.switchText}>
                <ThemedText>{label}</ThemedText>
                {hint ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {hint}
                  </ThemedText>
                ) : null}
              </View>
              <Switch
                value={privacy[key]}
                accessibilityLabel={label}
                onValueChange={(value) => setPrivacy((current) => ({ ...current, [key]: value }))}
              />
            </View>
          ))}
        </View>
      ) : null}

      <Button title={t('common.save')} loading={save.isPending} onPress={() => save.mutate()} />
    </>
  );
}

/**
 * The cover picture with the profile picture overlapping it, as on the profile itself.
 * Tapping either offers to change, reframe or remove it (or picks one, if there's none).
 */
function Pictures({
  name,
  avatar,
  cover,
  onAvatar,
  onCover,
}: {
  name: string;
  avatar: Image | null | undefined;
  cover: Image | null | undefined;
  onAvatar: (image: Image | null) => void;
  onCover: (image: Image | null) => void;
}) {
  const { t } = useTranslation();
  const shape = useShape();
  const theme = useTheme();
  const upload = useImageUpload();
  const [menu, setMenu] = useState<{ kind: PictureKind; anchor: MenuAnchor } | null>(null);
  const [cropping, setCropping] = useState<Cropping | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const avatarButton = useRef<ComponentRef<typeof View>>(null);
  const coverButton = useRef<ComponentRef<typeof View>>(null);

  const current = (kind: PictureKind) => (kind === 'avatar' ? avatar : cover);
  const setPicture = (kind: PictureKind, image: Image | null) =>
    (kind === 'avatar' ? onAvatar : onCover)(image);

  /** Upload a new picture, then frame it. */
  async function choose(kind: PictureKind) {
    setError(null);
    const result = await upload.pickAndUpload();
    if (result?.status === 'ok') {
      setCropping({ kind, picture: result.image, imageId: result.image.id, initial: null });
    } else if (result?.status === 'error') {
      setError(result.message ?? t('errors.unexpected'));
    }
  }

  /** Frame the current picture again, from the whole picture it was cropped from. */
  async function reframe(kind: PictureKind) {
    const image = current(kind);
    if (!image) return;
    setError(null);
    const { data } = await imagesRetrieve({ path: { id: image.id } });
    if (!data) {
      setError(t('errors.unexpected'));
      return;
    }
    setCropping({
      kind,
      picture: data.original ?? data,
      imageId: data.id,
      initial: data.original ? data.crop : null,
    });
  }

  const crop = useMutation({
    mutationFn: async ({ imageId, rect }: { kind: PictureKind; imageId: number; rect: CropRect }) =>
      (await imagesCropCreate({ path: { id: imageId }, body: rect, throwOnError: true })).data,
    onMutate: () => setCropError(null),
    onSuccess: (image, { kind }) => {
      setPicture(kind, image);
      setCropping(null);
    },
    onError: () => setCropError(t('errors.unexpected')),
  });

  function open(kind: PictureKind) {
    if (!current(kind)) {
      choose(kind);
      return;
    }
    const button = kind === 'avatar' ? avatarButton : coverButton;
    button.current?.measureInWindow((x, y, width, height) =>
      setMenu({ kind, anchor: { x, y, width, height } }),
    );
  }

  const actions = (kind: PictureKind): MenuAction[] => [
    {
      label: t(kind === 'avatar' ? 'editProfile.changeAvatar' : 'editProfile.changeCover'),
      onPress: () => choose(kind),
    },
    { label: t('editProfile.reframe'), onPress: () => reframe(kind) },
    {
      label: t(kind === 'avatar' ? 'editProfile.removeAvatar' : 'editProfile.removeCover'),
      destructive: true,
      onPress: () => setPicture(kind, null),
    },
  ];

  return (
    <View>
      <Pressable
        ref={coverButton}
        onPress={() => open('cover')}
        accessibilityLabel={t('editProfile.coverMenu')}
        style={({ pressed }) => pressed && styles.pressed}>
        {cover ? (
          <RemoteImage image={cover} style={[styles.cover, shape.picture]} contentFit="cover" />
        ) : (
          <ThemedView
            type="backgroundElement"
            style={[styles.cover, shape.picture, styles.coverEmpty]}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('editProfile.changeCover')}
            </ThemedText>
          </ThemedView>
        )}
        <CameraBadge style={styles.coverBadge} />
      </Pressable>
      <Pressable
        ref={avatarButton}
        onPress={() => open('avatar')}
        accessibilityLabel={t('editProfile.avatarMenu')}
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
        {/* A ring in the page colour, where the picture overlaps the cover. */}
        <View style={[styles.avatarRing, { backgroundColor: theme.background }]}>
          <Avatar name={name} image={avatar} size={AVATAR_SIZE} />
        </View>
        <CameraBadge style={styles.avatarBadge} />
      </Pressable>
      {upload.uploading ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('editProfile.uploading')}
        </ThemedText>
      ) : null}
      {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}

      <ActionMenu
        visible={menu !== null}
        anchor={menu?.anchor}
        actions={menu ? actions(menu.kind) : []}
        onClose={() => setMenu(null)}
      />
      <ImageCropper
        picture={cropping?.picture ?? null}
        aspect={cropping ? ASPECT[cropping.kind] : 1}
        round={cropping?.kind === 'avatar'}
        initial={cropping?.initial}
        busy={crop.isPending}
        error={cropError}
        onCancel={() => {
          setCropping(null);
          setCropError(null);
        }}
        onDone={(rect) =>
          cropping && crop.mutate({ kind: cropping.kind, imageId: cropping.imageId, rect })
        }
      />
    </View>
  );
}

/** Shows that a picture can be changed. */
function CameraBadge({ style }: { style: object }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.badge, { backgroundColor: theme.tint, borderColor: theme.background }, style]}>
      <SymbolView
        name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
        size={16}
        tintColor={theme.onTint}
      />
    </View>
  );
}

/** Common pronouns for the language, none, or one's own. */
function PronounPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  const options = t('editProfile.pronounOptions', { returnObjects: true }) as string[];
  const [custom, setCustom] = useState(() => value !== '' && !options.includes(value));

  return (
    <>
      <ThemedText type="smallBold">{t('editProfile.pronouns')}</ThemedText>
      <View style={styles.chips} role="radiogroup" aria-label={t('editProfile.pronouns')}>
        <Chip
          radio
          label={t('editProfile.pronounsNone')}
          selected={!custom && value === ''}
          onPress={() => {
            setCustom(false);
            onChange('');
          }}
        />
        {options.map((option) => (
          <Chip
            key={option}
            radio
            label={option}
            selected={!custom && value === option}
            onPress={() => {
              setCustom(false);
              onChange(option);
            }}
          />
        ))}
        <Chip
          radio
          label={t('editProfile.pronounsCustom')}
          selected={custom}
          onPress={() => {
            if (!custom && options.includes(value)) onChange('');
            setCustom(true);
          }}
        />
      </View>
      {custom ? (
        <TextField
          label={t('editProfile.pronounsCustomLabel')}
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
          maxLength={30}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    aspectRatio: 3,
  },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
  avatar: {
    alignSelf: 'flex-start',
    marginTop: -AVATAR_SIZE / 2,
    marginLeft: Spacing.three,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  badge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  bio: {
    minHeight: 80,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
  },
  group: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  privacy: {
    gap: Spacing.three,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
  },
});
