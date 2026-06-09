export type RhymesAudioCategory = "lullaby";

export type RhymesGcsRegistryEntry = {
  id: string;
  title: string;
  objectPath: string;
  durationSec: number | null;
  category: RhymesAudioCategory;
  sizeBytes: number;
  contentType: string;
};

export type RhymesGcsRegistry = {
  generatedAt: string;
  bucket: string;
  prefix: string;
  count: number;
  entries: RhymesGcsRegistryEntry[];
};

export type RhymesSignedUrlResponse = {
  success: boolean;
  audioId: string;
  title: string;
  signedUrl: string;
  expiresIn: number;
  cached?: boolean;
};
