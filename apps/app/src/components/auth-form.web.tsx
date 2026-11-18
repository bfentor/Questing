import { useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';

import type { AuthFormHandle } from './auth-form';

export type { AuthFormHandle } from './auth-form';

type AuthFormProps = {
  ref?: Ref<AuthFormHandle>;
  onSubmit: () => void;
  children: ReactNode;
};

/**
 * A real <form> around credential fields. Browser and extension password managers look for
 * one to recognise a login, and use its submit event to offer saving the password.
 */
export function AuthForm({ ref, onSubmit, children }: AuthFormProps) {
  const form = useRef<HTMLFormElement>(null);
  // Going through requestSubmit fires a genuine submit event for password managers to see.
  useImperativeHandle(ref, () => ({ submit: () => form.current?.requestSubmit() }), []);

  return (
    <form
      ref={form}
      method="post"
      // The API's messages explain mistakes; the browser's own validation bubbles would not match.
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      // Lay the fields out as if the form were not there.
      style={{ display: 'contents' }}>
      {children}
    </form>
  );
}
