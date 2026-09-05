/**
 * Audio storage port (§3.1). Backed by Cloudflare R2 via S3-compatible API.
 * Swap providers (AWS S3, Backblaze, MinIO...) by changing the adapter only.
 */

export interface SignedUrlOptions {
  /** lifetime in seconds for signed URLs */
  expiresIn?: number;
}

export interface AudioStorage {
  /**
   * Public or signed URL to read an object.
   * @param key object key, e.g. "audio/ja/water.mp3"
   */
  getUrl(key: string, opts?: SignedUrlOptions): Promise<string>;

  /** Server-side upload. Returns the object key. */
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string>;

  delete(key: string): Promise<void>;
}