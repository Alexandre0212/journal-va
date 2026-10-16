import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { anomalyBlobKey, anomalyBlobStoragePath, parseAnomalyBlobKey } from "@/domain/anomaly-files";

const STORE_NAME = "anomaly-files";

export interface StorageService {
  save(input: { id: string; name: string; bytes: Uint8Array }): Promise<string>;
  read(storagePath: string): Promise<ArrayBuffer | null>;
  remove(storagePath: string): Promise<void>;
}

const localDiskStorage: StorageService = {
  async save({ id, name, bytes }) {
    const dir = path.join(process.cwd(), "storage", "anomalies");
    await mkdir(dir, { recursive: true });
    const fileName = anomalyBlobKey(id, name, Date.now()).slice("anomalies/".length);
    const storagePath = path.join(dir, fileName);
    await writeFile(storagePath, bytes);
    return storagePath;
  },
  async read(storagePath) {
    const root = path.resolve(process.cwd(), "storage", "anomalies");
    const resolved = path.resolve(storagePath);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return null;
    try {
      return copyBytes(await readFile(resolved));
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  },
  async remove(storagePath) {
    const root = path.resolve(process.cwd(), "storage", "anomalies");
    const resolved = path.resolve(storagePath);
    if (resolved !== root && resolved.startsWith(`${root}${path.sep}`)) await rm(resolved, { force: true });
  },
};

const netlifyBlobStorage: StorageService = {
  async save({ id, name, bytes }) {
    const key = anomalyBlobKey(id, name, Date.now());
    await getStore({ name: STORE_NAME, consistency: "strong" }).set(key, copyBytes(bytes));
    return anomalyBlobStoragePath(key);
  },
  async read(storagePath) {
    const key = parseAnomalyBlobKey(storagePath);
    if (!key) return null;
    const data = await getStore({ name: STORE_NAME, consistency: "strong" }).get(key, { type: "arrayBuffer" });
    return data ?? null;
  },
  async remove(storagePath) {
    const key = parseAnomalyBlobKey(storagePath);
    if (!key) return;
    await getStore({ name: STORE_NAME, consistency: "strong" }).delete(key);
  },
};

export function anomalyStorage(): StorageService {
  const onNetlify = process.env.NETLIFY === "true";
  return {
    save(input) {
      return (onNetlify ? netlifyBlobStorage : localDiskStorage).save(input);
    },
    read(storagePath) {
      if (parseAnomalyBlobKey(storagePath)) return onNetlify ? netlifyBlobStorage.read(storagePath) : Promise.resolve(null);
      return localDiskStorage.read(storagePath);
    },
    remove(storagePath) {
      if (parseAnomalyBlobKey(storagePath)) return onNetlify ? netlifyBlobStorage.remove(storagePath) : Promise.resolve();
      return localDiskStorage.remove(storagePath);
    },
  };
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function copyBytes(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}
