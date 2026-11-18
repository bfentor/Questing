import { Redirect } from 'expo-router';

/** The following feed is part of the home page now; old links and bookmarks land there. */
export default function FollowingRedirect() {
  return <Redirect href="/" />;
}
