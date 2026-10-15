import { authMode, microsoftConfigured } from "@/server/auth/session";

export default function ConnexionPage() {
  const ready = authMode() === "entra" && microsoftConfigured();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <p className="text-caption text-accent-text">Connexion</p>
      <h1 className="text-h1">Se connecter avec Microsoft</h1>
      {ready ? (
        <p>Les variables Microsoft sont présentes. Le branchement Auth.js reste à activer dans <code>src/server/auth/session.ts</code>. Aucune session n'est simulée.</p>
      ) : (
        <p>La connexion Microsoft 365 n'est pas configurée. Renseignez <code>AUTH_MICROSOFT_ID</code>, <code>AUTH_MICROSOFT_SECRET</code> et <code>AUTH_SECRET</code>, puis <code>AUTH_MODE=entra</code>. Aucun compte n'est ouvert à votre place.</p>
      )}
    </main>
  );
}
