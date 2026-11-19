import { useEffect, useRef } from 'react';

import type { ImagePaste, PastedImage } from './use-image-paste.shared';

const NOTHING_TO_PASTE: ImagePaste = { canPaste: false, paste: async () => {} };

/**
 * Pictures and GIFs pasted (Ctrl/⌘+V) anywhere on the page while `enabled`. Text pasted with
 * them still goes into the text box.
 */
export function useImagePaste(
  onImages: (images: PastedImage[]) => void,
  enabled: boolean,
): ImagePaste {
  const onImagesRef = useRef(onImages);
  useEffect(() => {
    onImagesRef.current = onImages;
  }, [onImages]);

  useEffect(() => {
    if (!enabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const data = event.clipboardData;
      const files = [...(data?.files ?? [])].filter((file) => file.type.startsWith('image/'));
      if (!files.length) return;
      if (!data?.types.includes('text/plain')) event.preventDefault();
      onImagesRef.current(files.map((file) => ({ file, preview: URL.createObjectURL(file) })));
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [enabled]);

  return NOTHING_TO_PASTE;
}
