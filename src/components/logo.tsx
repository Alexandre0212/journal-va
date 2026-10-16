import Image from "next/image";

const SIZES: Record<string, { width: number; height: number }> = {
  "/logos/safya.png": { width: 2292, height: 648 },
  "/logos/triage-plus.png": { width: 333, height: 55 },
  "/logos/ractac.png": { width: 87, height: 75 },
};

export function Logo({ src, alt, height = 32, priority = false }: { src: string; alt: string; height?: number; priority?: boolean }) {
  const size = SIZES[src];
  if (!size) return null;
  const width = Math.max(1, Math.round((size.width / size.height) * height));
  return <Image src={src} alt={alt} width={width} height={height} unoptimized priority={priority} className="object-contain" style={{ width, height }} />;
}
