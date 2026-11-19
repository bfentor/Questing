import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { ImagePaste, PastedImage } from './use-image-paste.shared';

/**
 * Phones' text boxes don't take pictures, so this offers the clipboard's picture for a Paste
 * button while `enabled`: it looks when the screen opens, when the app comes back to the
 * front and when the clipboard changes. (A GIF arrives as its first frame.)
 */
export function useImagePaste(
  onImages: (images: PastedImage[]) => void,
  enabled: boolean,
): ImagePaste {
  const [canPaste, setCanPaste] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    // hasImageAsync doesn't read the picture, so iOS doesn't ask to allow pasting yet.
    const look = () =>
      Clipboard.hasImageAsync()
        .then((has) => current && setCanPaste(has))
        .catch(() => current && setCanPaste(false));
    look();
    const app = AppState.addEventListener('change', (state) => state === 'active' && look());
    const clipboard = Clipboard.addClipboardListener(look);
    return () => {
      current = false;
      app.remove();
      Clipboard.removeClipboardListener(clipboard);
    };
  }, [enabled]);

  const paste = useCallback(async () => {
    const image = await Clipboard.getImageAsync({ format: 'png' });
    if (!image) {
      setCanPaste(false);
      return;
    }
    // Uploads need a file, so the picture is written to the cache first.
    const file = new File(Paths.cache, `pasted-${Date.now()}.png`);
    file.create();
    file.write(image.data.replace(/^data:image\/\w+;base64,/, ''), { encoding: 'base64' });
    onImages([
      { file: { uri: file.uri, name: 'pasted.png', type: 'image/png' }, preview: file.uri },
    ]);
  }, [onImages]);

  return { canPaste: enabled && canPaste, paste };
}
