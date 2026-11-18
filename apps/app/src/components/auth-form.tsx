import { useImperativeHandle, type ReactNode, type Ref } from 'react';

export type AuthFormHandle = {
  /** Submits the form, the way pressing its submit button would. */
  submit: () => void;
};

type AuthFormProps = {
  ref?: Ref<AuthFormHandle>;
  onSubmit: () => void;
  children: ReactNode;
};

/**
 * Groups credential fields so password managers recognise them as one login form.
 * On iOS and Android the fields' content types already do that, so nothing wraps them.
 */
export function AuthForm({ ref, onSubmit, children }: AuthFormProps) {
  useImperativeHandle(ref, () => ({ submit: onSubmit }), [onSubmit]);
  return children;
}
