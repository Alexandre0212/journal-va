export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Chargement">
      <div className="h-10 w-64 animate-pulse rounded-[12px] bg-sunken" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-40 animate-pulse rounded-[16px] bg-sunken" />
        <div className="h-40 animate-pulse rounded-[16px] bg-sunken" />
        <div className="h-40 animate-pulse rounded-[16px] bg-sunken" />
      </div>
    </div>
  );
}
