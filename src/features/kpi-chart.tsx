"use client";

import { useReducedMotion } from "motion/react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay } from "@/lib/dates";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function KpiChart({
  points, target, color, unit, height = 112,
}: {
  points: Array<{ date: string; value: number }>;
  target: number | null;
  color: string;
  unit: string;
  height?: number;
}) {
  const reduced = useReducedMotion();
  if (!points.length) {
    return (
      <div className="kpi-chart kpi-chart-empty" style={{ height }}>
        <svg viewBox="0 0 240 72" aria-hidden>
          <path d="M8 58 H232" stroke="currentColor" strokeOpacity="0.35" />
          <path d="M8 58 V12" stroke="currentColor" strokeOpacity="0.35" />
          <circle cx="120" cy="40" r="3.5" fill="currentColor" fillOpacity="0.35" />
        </svg>
        <p>Aucune mesure enregistrée</p>
      </div>
    );
  }
  const max = Math.max(...points.map((point) => point.value), target ?? 0, 1);
  return (
    <div className="kpi-chart" style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={(date) => formatDay(String(date))} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, max]} />
          <Tooltip
            formatter={(value) => [`${nf.format(Number(value))}${unit ? ` ${unit}` : ""}`, "Valeur"]}
            labelFormatter={(label) => formatDay(String(label))}
          />
          {target != null ? <ReferenceLine y={target} stroke={color} strokeDasharray="4 4" strokeOpacity={0.7} /> : null}
          {points.length >= 2 ? (
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.14} dot={{ r: 3, fill: color }} isAnimationActive={!reduced} />
          ) : (
            <Line dataKey="value" stroke={color} strokeWidth={0} dot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
