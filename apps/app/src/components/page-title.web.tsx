import Head from 'expo-router/head';

/**
 * The browser tab's title: "Upcoming · Questing", or just "Questing" without a title. Only the
 * page on screen sets it (Head ignores pages that aren't focused), so it follows navigation.
 */
export function PageTitle({ title }: { title?: string | null }) {
  return (
    <Head>
      <title>{title ? `${title} · Questing` : 'Questing'}</title>
    </Head>
  );
}
