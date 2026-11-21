import { postsLikeDestroy, postsLikeUpdate, type Post } from '@questing/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { useAuth } from '@/auth/auth-provider';
import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { updateCachedPost } from '@/lib/post-cache';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/** Heart toggle with the like count; every copy of the post shows the change straight away. */
export function LikeButton({ post }: { post: Post }) {
  const { t } = useTranslation();
  const { status } = useAuth();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const show = (liked: boolean) =>
    updateCachedPost(queryClient, post.id, (cached) => ({
      ...cached,
      is_liked: liked,
      like_count: Math.max(0, cached.like_count + (liked ? 1 : 0) - (cached.is_liked ? 1 : 0)),
    }));
  const toggle = useMutation({
    mutationFn: async (like: boolean) => {
      const options = { path: { id: post.id }, throwOnError: true } as const;
      await (like ? postsLikeUpdate(options) : postsLikeDestroy(options));
    },
    onMutate: (like) => {
      show(like);
      return { previous: post.is_liked };
    },
    onError: (_error, _like, context) => context && show(context.previous),
  });

  const liked = post.is_liked;
  const count = post.like_count;
  const reducedMotion = useReducedMotion();
  // Liking makes the heart jump: up past its size and back, with a little wobble.
  const pop = useSharedValue(1);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const press = () => {
    if (status !== 'signed-in') {
      router.push('/sign-in');
      return;
    }
    if (!liked && !reducedMotion) {
      pop.set(
        withSequence(
          withSpring(1.45, { damping: 8, stiffness: 600 }),
          withSpring(1, { damping: 6, stiffness: 300 }),
        ),
      );
    }
    toggle.mutate(!liked);
  };

  return (
    <PressableScale
      role="button"
      aria-pressed={liked}
      accessibilityLabel={liked ? t('posts.unlike') : t('posts.like')}
      hitSlop={8}
      squish="icon"
      feedback="tick"
      onPress={press}
      style={styles.button}>
      <Animated.View style={heart}>
        <SymbolView
          name={
            liked
              ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
              : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }
          }
          size={22}
          tintColor={liked ? theme.tint : theme.textSecondary}
        />
      </Animated.View>
      {count > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {count}
        </ThemedText>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
  },
});
