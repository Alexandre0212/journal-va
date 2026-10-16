"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer } from "recharts";

export function Spark({ points, target, stroke = "var(--primary-fg)" }: { points: Array<{ index: number; value: number }>; target: number | null; stroke?: string }) {
  if (points.length < 2) return <p className="text-small text-muted">Pas assez de points pour une courbe.</p>;
  return (
    <div className="h-16 w-full" aria-hidden>
      <ResponsiveContainer>
        <LineChart data={points}>
          {target ? <ReferenceLine y={target} stroke="var(--text-secondary)" strokeDasharray="3 3" /> : null}
          <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={1.8} dot={false} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
