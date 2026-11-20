import { eventsRetrieveOptions, imagesRetrieveOptions, postsCreate } from '@questing/api';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { MAX_POST_IMAGES, PostForm, type PostFieldErrors } from '@/components/post-form';
import { Screen } from '@/components/screen';
import { goBack } from '@/lib/navigation';

/**
 * Write a post; `?event=<id>` shares that event in it, `?body=` starts it with that text and
 * `?images=1,2` with those uploaded pictures (e.g. pasted into the home page's post box).
 */
export default function NewPostScreen() {
  const {
    event: eventId,
    body = '',
    images: imageIds = '',
  } = useLocalSearchParams<{ event?: string; body?: string; images?: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const event = useQuery({
    ...eventsRetrieveOptions({ path: { id: Number(eventId) } }),
    enabled: Boolean(eventId),
  });
  const ids = imageIds.split(',').map(Number).filter(Boolean).slice(0, MAX_POST_IMAGES);
  const images = useQueries({
    queries: ids.map((id) => imagesRetrieveOptions({ path: { id } })),
  });

  if ((eventId && !event.data) || images.some((image) => image.isPending)) {
    return <ActivityIndicator style={{ marginTop: 64 }} />;
  }

  return (
    <Screen hasHeader keyboardShouldPersistTaps="handled">
      <PostForm
        mode="create"
        initial={{
          body,
          images: images.flatMap((image) => (image.data ? [image.data] : [])),
          event: event.data ?? null,
        }}
        submitLabel={t('posts.publish')}
        onSubmit={async (body) => {
          const { data, error } = await postsCreate({ body });
          if (!data) {
            return (error ?? {}) as PostFieldErrors;
          }
          queryClient.invalidateQueries();
          goBack('/');
          return null;
        }}
      />
    </Screen>
  );
}
