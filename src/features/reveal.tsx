"use client";

import NumberFlow from "@number-flow/react";

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="reveal" style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

export function Counter({ value }: { value: number }) {
  return <NumberFlow value={value} className="text-kpi" />;
}
