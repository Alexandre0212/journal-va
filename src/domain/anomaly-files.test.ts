import { describe, expect, it } from "vitest";
import {
  ANOMALY_FILE_MAX_BYTES,
  anomalyBlobKey,
  anomalyBlobStoragePath,
  anomalyFileError,
  parseAnomalyBlobKey,
} from "@/domain/anomaly-files";

describe("pièces jointes d'anomalie", () => {
  it("accepte les mêmes types et la même taille maximale", () => {
    expect(anomalyFileError({ type: "image/png", size: ANOMALY_FILE_MAX_BYTES })).toBeNull();
    expect(anomalyFileError({ type: "application/pdf", size: 1 })).toBeNull();
    expect(anomalyFileError({ type: "video/mp4", size: 1 })).toBeNull();
    expect(anomalyFileError({ type: "image/gif", size: 1 })).toBe("Type de fichier non accepté.");
    expect(anomalyFileError({ type: "image/jpeg", size: ANOMALY_FILE_MAX_BYTES + 1 })).toBe("Fichier trop lourd (8 Mo maximum).");
  });

  it("ne reconnaît qu'une clé de blob interne", () => {
    const key = anomalyBlobKey("an_1", "photo finale.png", 10);
    expect(key).toBe("anomalies/an_1-10-photo_finale.png");
    expect(parseAnomalyBlobKey(anomalyBlobStoragePath(key))).toBe(key);
    expect(parseAnomalyBlobKey("C:/storage/anomalies/fichier.png")).toBeNull();
    expect(parseAnomalyBlobKey(anomalyBlobStoragePath("anomalies/../secret"))).toBeNull();
  });
});
