"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="surface flex flex-col gap-3 p-6">
      <h1 className="text-h2">Une partie des données ne peut pas être chargée</h1>
      <p className="text-small text-muted">{error.message || "Réessayez dans un instant."}</p>
      <button type="button" className="btn btn-primary w-fit" onClick={reset}>Réessayer</button>
    </div>
  );
}
