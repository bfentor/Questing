import type { ReactNode } from 'react';

/** Phones have native tabs instead (see app-tabs.tsx); the web wraps every page in its navigation. */
export function WebShell({ children }: { children: ReactNode }) {
  return children;
}
