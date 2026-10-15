import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { DEFAULT_DEV_USER_ID, DEV_ACTORS } from "@/domain/actors";
import { prisma } from "@/server/db";

export { DEFAULT_DEV_USER_ID, DEV_ACTORS };

export type AuthMode = "dev" | "entra";

export function authMode(): AuthMode {
  const mode = process.env.AUTH_MODE;
  if (mode === "dev" && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_MODE=dev est refusé quand NODE_ENV=production.");
  }
  if (mode === "entra") return "entra";
  if (mode === "dev" || process.env.NODE_ENV !== "production") return "dev";
  return "entra";
}

export function microsoftConfigured(): boolean {
  return Boolean(process.env.AUTH_MICROSOFT_ID && process.env.AUTH_MICROSOFT_SECRET && process.env.AUTH_SECRET);
}

export async function getCurrentUser(): Promise<User | null> {
  const mode = authMode();
  if (mode === "entra") {
    if (!microsoftConfigured()) return null;
    // Le branchement Auth.js + Entra ID se fait dans ce fichier seulement.
    return null;
  }
  const jar = await cookies();
  const chosen = jar.get("va-as")?.value;
  const allowed = DEV_ACTORS.some((actor) => actor.id === chosen);
  const id = allowed && chosen ? chosen : process.env.DEV_USER_ID || DEFAULT_DEV_USER_ID;
  return prisma.user.findUnique({ where: { id } });
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    if (authMode() === "entra") redirect("/connexion");
    redirect("/configuration");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/non-autorise");
  return user;
}

export async function setDevActor(userId: string) {
  if (authMode() !== "dev") {
    throw new Error("Le sélecteur n'est disponible qu'en mode dev.");
  }
  if (!DEV_ACTORS.some((actor) => actor.id === userId)) {
    throw new Error("Utilisateur inconnu.");
  }
  const jar = await cookies();
  jar.set("va-as", userId, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
}
