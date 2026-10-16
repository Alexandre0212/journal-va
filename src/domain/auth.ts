export type AuthMode = "dev" | "preview" | "entra";

export function resolveAuthMode(mode: string | undefined, nodeEnv: string | undefined): AuthMode {
  if (mode === "dev" && nodeEnv === "production") {
    throw new Error("AUTH_MODE=dev est refusé quand NODE_ENV=production.");
  }
  if (mode === "preview") return "preview";
  if (mode === "entra") return "entra";
  if (mode === "dev" || nodeEnv !== "production") return "dev";
  return "entra";
}
