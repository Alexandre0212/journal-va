const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4"]);

export const ANOMALY_FILE_MAX_BYTES = 8_000_000;
export const BLOB_STORAGE_PREFIX = "netlify-blob:";

export function anomalyFileError(file: { type: string; size: number }): string | null {
  if (!ALLOWED_MIME.has(file.type)) return "Type de fichier non accepté.";
  if (file.size > ANOMALY_FILE_MAX_BYTES) return "Fichier trop lourd (8 Mo maximum).";
  return null;
}

export function anomalyBlobKey(id: string, name: string, stamp: number): string {
  const safe = name.replace(/[^\w.\-]+/g, "_");
  return `anomalies/${id}-${stamp}-${safe}`;
}

export function anomalyBlobStoragePath(key: string): string {
  return `${BLOB_STORAGE_PREFIX}${key}`;
}

export function parseAnomalyBlobKey(storagePath: string): string | null {
  if (!storagePath.startsWith(BLOB_STORAGE_PREFIX)) return null;
  const key = storagePath.slice(BLOB_STORAGE_PREFIX.length);
  const marker = "anomalies/";
  if (!key.startsWith(marker)) return null;
  const fileName = key.slice(marker.length);
  if (fileName.length === 0 || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) return null;
  if (!/^[\w.\-]+$/.test(fileName)) return null;
  return key;
}
