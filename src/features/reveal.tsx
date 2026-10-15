"use client";

import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  const [play] = useState(() => typeof window !== "undefined" && sessionStorage.getItem("haske-intro") !== "1");
  useEffect(() => { sessionStorage.setItem("haske-intro", "1"); }, []);
  if (!play) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0.2 : 0.48, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export function Counter({ value }: { value: number }) {
  return <NumberFlow value={value} className="text-kpi" />;
}
