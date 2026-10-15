import Link from "next/link";

export default function ConfigurationPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <p className="text-caption text-accent-text">Configuration</p>
      <h1 className="text-h1">La base n'est pas encore prête</h1>
      <p>Aucun utilisateur n'est chargé. Lancez la migration Prisma, puis l'import des données d'origine. Tant que ce n'est pas fait, l'application n'affiche pas de faux tableau de bord.</p>
      <pre className="surface overflow-auto p-4 text-small">npx prisma migrate deploy{"\n"}npm run db:import</pre>
      <Link href="/" className="btn btn-primary w-fit">Réessayer</Link>
    </main>
  );
}
