import { uploadImage, type Image, type Post, type PostRequestWritable } from '@sidequest/api';
import { useMutation } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';
import { pickImages } from '@/hooks/use-image-upload';
import { useImagePaste } from '@/hooks/use-image-paste';
import type { PastedImage } from '@/hooks/use-image-paste.shared';

import { ActingAsPicker } from './acting-as-picker';
import { Button } from './button';
import { EventCard } from './event-card';
import { IconButton } from './icon-button';
import { RemoteImage } from './remote-image';
import { TextField } from './text-field';
import { ThemedText } from './themed-text';

export const MAX_POST_IMAGES = 4;

export type PostFieldErrors = Partial<
  Record<keyof PostRequestWritable | 'non_field_errors', string[]>
>;

/**
 * A picture in the post: uploaded (`image`), or still uploading or failed, shown meanwhile
 * from the device (`preview`).
 */
type Attachment = { key: string; image?: Image; preview?: string; failed?: boolean };

let nextKey = 0;

type PostFormProps = {
  mode: 'create' | 'edit';
  initial?: Pick<Post, 'body' | 'images' | 'event'>;
  submitLabel: string;
  /** Resolves to the server's field errors, or null once saved. */
  onSubmit: (body: PostRequestWritable) => Promise<PostFieldErrors | null>;
};

/** Text, up to four pictures and an optional shared event; posting as yourself or an organization. */
export function PostForm({ mode, initial, submitLabel, onSubmit }: PostFormProps) {
  const shape = useShape();
  const { t } = useTranslation();
  const theme = useTheme();
  const [body, setBody] = useState(initial?.body ?? '');
  const [attachments, setAttachments] = useState<Attachment[]>(() =>
    (initial?.images ?? []).map((image) => ({ key: `image-${image.id}`, image })),
  );
  const [author, setAuthor] = useState<string>();
  const [uploadError, setUploadError] = useState<string>();
  const [errors, setErrors] = useState<PostFieldErrors>({});
  const event = initial?.event ?? null;
  const room = MAX_POST_IMAGES - attachments.length;
  const uploading = attachments.some((attachment) => !attachment.image && !attachment.failed);
  // Room left, read by the paste handler without re-registering it.
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const submit = useMutation({
    mutationFn: async () => {
      const fieldErrors = await onSubmit({
        body,
        image_ids: attachments.flatMap((attachment) =>
          attachment.image ? [attachment.image.id] : [],
        ),
        ...(mode === 'create' ? { event_id: event?.id ?? null } : {}),
        ...(mode === 'create' && author ? { author_handle: author } : {}),
      });
      if (fieldErrors) {
        setErrors(fieldErrors);
        throw new Error('invalid');
      }
    },
  });

  const update = (key: string, change: Partial<Attachment>) =>
    setAttachments((current) =>
      current.map((attachment) =>
        attachment.key === key ? { ...attachment, ...change } : attachment,
      ),
    );

  /** Shows each picture right away, and uploads them side by side. */
  const attach = useCallback((pictures: PastedImage[]) => {
    const added = pictures
      .slice(0, Math.max(0, roomRef.current))
      .map((picture) => ({ ...picture, key: `new-${nextKey++}` }));
    if (!added.length) return;
    setUploadError(undefined);
    setAttachments((current) => [
      ...current,
      ...added.map(({ key, preview }) => ({ key, preview })),
    ]);
    for (const { key, file } of added) {
      uploadImage(file)
        .then((result) => {
          if (result.status === 'ok') {
            update(key, { image: result.image });
          } else {
            update(key, { failed: true });
            setUploadError(result.message ?? t('errors.unexpected'));
          }
        })
        .catch(() => {
          update(key, { failed: true });
          setUploadError(t('errors.network'));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paste = useImagePaste(attach, room > 0);

  const remove = (key: string) => {
    setAttachments((current) => {
      const gone = current.find((attachment) => attachment.key === key);
      // Pasted pictures on the web hold memory until their preview URL is let go.
      if (Platform.OS === 'web' && gone?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(gone.preview);
      }
      return current.filter((attachment) => attachment.key !== key);
    });
  };

  const messages = Object.values(errors).flat();
  const empty = !body.trim() && !attachments.some((attachment) => attachment.image) && !event;

  return (
    <>
      {mode === 'create' ? (
        <ActingAsPicker label={t('posts.postAs')} value={author} onChange={setAuthor} />
      ) : null}
      <TextField
        label={t('posts.body')}
        value={body}
        onChangeText={setBody}
        placeholder={event ? t('posts.aboutEventPlaceholder') : t('posts.placeholder')}
        multiline
        maxLength={2000}
        style={styles.body}
      />
      {attachments.length ? (
        <View style={styles.images}>
          {attachments.map((attachment) => (
            <View key={attachment.key} style={styles.thumbnail}>
              {attachment.image ? (
                <RemoteImage
                  image={attachment.image}
                  style={[styles.thumbnailImage, shape.inner]}
                  contentFit="cover"
                />
              ) : (
                <ExpoImage
                  source={{ uri: attachment.preview }}
                  style={[styles.thumbnailImage, shape.inner]}
                  contentFit="cover"
                />
              )}
              {attachment.image ? null : (
                <View
                  style={[
                    styles.overlay,
                    shape.inner,
                    {
                      backgroundColor: attachment.failed
                        ? 'rgba(220,38,38,0.35)'
                        : 'rgba(0,0,0,0.35)',
                    },
                  ]}>
                  {attachment.failed ? null : (
                    <ActivityIndicator color="#fff" accessibilityLabel={t('eventForm.uploading')} />
                  )}
                </View>
              )}
              <View style={[styles.remove, { backgroundColor: theme.background }]}>
                <IconButton
                  icon={{ ios: 'xmark.circle.fill', material: 'cancel' }}
                  label={t('posts.removeImage')}
                  size={22}
                  onPress={() => remove(attachment.key)}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {room > 0 ? (
        <View style={styles.addRow}>
          <Pressable role="button" onPress={async () => attach(await pickImages(room))}>
            <ThemedText type="small" themeColor="tint">
              {t('posts.addImage')}
            </ThemedText>
          </Pressable>
          {paste.canPaste ? (
            <Pressable role="button" onPress={() => paste.paste()}>
              <ThemedText type="small" themeColor="tint">
                {t('posts.pasteImage')}
              </ThemedText>
            </Pressable>
          ) : null}
          {Platform.OS === 'web' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('posts.pasteHint')}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      {uploadError ? (
        <ThemedText type="small" themeColor="danger">
          {uploadError}
        </ThemedText>
      ) : null}
      {event ? <EventCard event={event} /> : null}
      {messages.map((message) => (
        <ThemedText key={message} type="small" themeColor="danger">
          {message}
        </ThemedText>
      ))}
      <Button
        title={submitLabel}
        disabled={empty || uploading}
        loading={submit.isPending}
        onPress={() => submit.mutate()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    minHeight: 120,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
  },
  images: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // Two side by side, big enough to see what's in them.
  thumbnail: {
    width: '48%',
    aspectRatio: 1,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    borderRadius: 999,
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
