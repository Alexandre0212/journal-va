"use client";

export function Ribbon({ className = "" }: { className?: string }) {
  return (
    <svg className={`ribbon ribbon-wave ${className}`} viewBox="0 0 1200 140" aria-hidden>
      <path className="ribbon-draw" pathLength={1} d="M20 90 C 180 20, 280 120, 460 70 S 760 10, 980 78 S 1160 120, 1180 60" stroke="var(--ribbon-blue)" strokeWidth="8" />
      <path className="ribbon-draw" pathLength={1} d="M20 78 C 200 130, 320 20, 500 84 S 800 130, 1000 58 S 1160 20, 1180 84" stroke="var(--ribbon-orange)" strokeWidth="8" />
      <path className="ribbon-draw" pathLength={1} d="M40 84 C 220 40, 340 110, 520 64 S 820 30, 1040 90" stroke="var(--ribbon-green)" strokeWidth="6" />
    </svg>
  );
}
