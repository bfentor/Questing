import { uploadImage, type UploadResult } from '@questing/api';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import type { PastedImage } from './use-image-paste.shared';

type PickOptions = {
  /** Crop to this aspect ratio, e.g. [1, 1] for avatars. */
  aspect?: [number, number];
};

/** Lets the user pick a picture from their library and uploads it. */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  /** Resolves to null if the user cancelled. */
  async function pickAndUpload({ aspect }: PickOptions = {}): Promise<UploadResult | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: aspect !== undefined,
      aspect,
      quality: 0.9,
      // JPEG rather than HEIC on iOS; the server re-encodes it anyway.
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    setUploading(true);
    try {
      return await uploadImage(
        asset.file ?? {
          uri: asset.uri,
          name: asset.fileName ?? 'photo.jpg',
          type: asset.mimeType ?? 'image/jpeg',
        },
      );
    } finally {
      setUploading(false);
    }
  }

  return { pickAndUpload, uploading };
}

/**
 * Lets the user pick up to `limit` pictures (GIFs too) without uploading them yet: each comes
 * with a local preview, to show while it uploads. Resolves to [] if they cancelled.
 */
export async function pickImages(limit: number): Promise<PastedImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.9,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) {
    return [];
  }
  return result.assets.slice(0, limit).map((asset) => ({
    file: asset.file ?? {
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    },
    preview: asset.uri,
  }));
}
