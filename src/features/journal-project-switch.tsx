"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

export function JournalProjectSwitch({ projects, activeId, day }: { projects: Array<{ id: string; name: string }>; activeId: string; day: string }) {
  const reduce = useReducedMotion();
  return (
    <nav className="journal-switch" aria-label="Projet du journal">
      {projects.map((item) => {
        const selected = item.id === activeId;
        return (
          <Link key={item.id} data-project={item.id} className={selected ? "is-on" : ""} href={`/journal?jour=${day}&projet=${item.id}`} aria-current={selected ? "page" : undefined}>
            {selected ? (
              <motion.span
                className="journal-switch-fill"
                layoutId="journal-project-fill"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span>{item.name}</span>
            {selected ? <Check size={15} aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
