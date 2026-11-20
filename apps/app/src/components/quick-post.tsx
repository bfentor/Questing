import { postsCreate, uploadImage } from '@questing/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useImagePaste } from '@/hooks/use-image-paste';
import type { PastedImage } from '@/hooks/use-image-paste.shared';
import { useMe } from '@/hooks/use-me';
import { useShape } from '@/hooks/use-shape';
import { useTheme } from '@/hooks/use-theme';

import { Avatar } from './avatar';
import { Button } from './button';
import { IconButton } from './icon-button';
import { MAX_POST_IMAGES, type PostFieldErrors } from './post-form';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/**
 * A text box on the home page for a quick thought or event idea, posted as yourself without
 * leaving the page. Pictures and posting as an organization open the full composer, keeping
 * what's been typed; on the website, pasting a picture there opens it with the picture added.
 */
export function QuickPost() {
  const { t } = useTranslation();
  const shape = useShape();
  const theme = useTheme();
  const me = useMe();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [posted, setPosted] = useState(false);
  // Home stays open under other pages on the website: only take pastes while it's in view.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  // Uploads pasted pictures, then hands them and the text to the full composer.
  const withPictures = useMutation({
    mutationFn: async (pictures: PastedImage[]) => {
      const results = await Promise.all(
        pictures.slice(0, MAX_POST_IMAGES).map((picture) => uploadImage(picture.file)),
      );
      const failed = results.find((result) => result.status === 'error');
      if (failed?.status === 'error') {
        setErrors([failed.message ?? t('errors.unexpected')]);
        throw new Error('upload');
      }
      return results.flatMap((result) => (result.status === 'ok' ? [result.image.id] : []));
    },
    onSuccess: (ids) => {
      router.push({ pathname: '/posts/new', params: { body, images: ids.join(',') } });
      setBody('');
      setErrors([]);
    },
  });
  useImagePaste(withPictures.mutate, Platform.OS === 'web' && focused);

  const submit = useMutation({
    mutationFn: async () => {
      const { data, error } = await postsCreate({ body: { body: body.trim() } });
      if (!data) {
        setErrors(Object.values((error ?? {}) as PostFieldErrors).flat());
        throw new Error('invalid');
      }
    },
    onSuccess: () => {
      setBody('');
      setErrors([]);
      setPosted(true);
      queryClient.invalidateQueries();
    },
  });

  function change(text: string) {
    setBody(text);
    setPosted(false);
  }

  const empty = !body.trim();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, shape.box]}>
      <View style={styles.row}>
        {me ? <Avatar name={me.display_name} image={me.avatar} size={36} /> : null}
        <TextInput
          accessibilityLabel={t('posts.quickLabel')}
          placeholder={t('posts.quickPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          value={body}
          onChangeText={change}
          multiline
          maxLength={2000}
          style={[
            styles.input,
            shape.field,
            { color: theme.text, backgroundColor: theme.background },
          ]}
        />
      </View>
      {errors.map((message) => (
        <ThemedText key={message} type="small" themeColor="danger">
          {message}
        </ThemedText>
      ))}
      <View style={styles.actions}>
        <IconButton
          icon={{ ios: 'photo.on.rectangle', material: 'add_photo_alternate' }}
          label={t('posts.moreOptions')}
          size={22}
          onPress={() => router.push({ pathname: '/posts/new', params: { body } })}
        />
        <View style={styles.spacer}>
          {withPictures.isPending ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('eventForm.uploading')}
            </ThemedText>
          ) : posted ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('posts.posted')}
            </ThemedText>
          ) : null}
        </View>
        <Button
          title={t('posts.publish')}
          size="small"
          disabled={empty}
          loading={submit.isPending}
          onPress={() => submit.mutate()}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 160,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  spacer: {
    flex: 1,
  },
});
