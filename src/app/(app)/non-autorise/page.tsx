import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="surface flex max-w-xl flex-col gap-3 p-6">
      <h1 className="text-h2">Accès réservé</h1>
      <p>Cette partie est réservée aux administrateurs. Le masquage du menu ne suffit pas : le serveur a refusé l'action.</p>
      <Link href="/" className="btn btn-primary w-fit">Retour au tableau de bord</Link>
    </div>
  );
}
