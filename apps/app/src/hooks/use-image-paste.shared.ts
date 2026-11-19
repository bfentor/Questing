import type { NativeFile } from '@sidequest/api';

/** A pasted picture: what to upload, and something to show meanwhile. */
export type PastedImage = { file: Blob | NativeFile; preview: string };

export type ImagePaste = {
  /** Phones: whether there's a picture on the clipboard, for a Paste button. */
  canPaste: boolean;
  paste: () => Promise<void>;
};
