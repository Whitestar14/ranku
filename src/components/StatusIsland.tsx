import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useShallow } from "zustand/react/shallow";
import { Plus } from "lucide-react";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { useActivityState } from "@/state/activityState";
import { motion as motionPreset } from "@/lib/motion";

const usePrefersReducedMotion = () => {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
};

const SUCCESS_COLOR = "var(--color-accent-green, #30d158)";

export const StatusIsland: React.FC<{
  onCreateProject: () => void;
  canCreate?: boolean;
}> = ({ onCreateProject, canCreate = true }) => {
  const { phase, label, progress, seq } = useActivityState(
    useShallow((s) => ({
      phase: s.phase,
      label: s.label,
      progress: s.progress,
      seq: s.seq,
    })),
  );

  const idle = phase === "idle";
  const busy = phase === "busy";
  const success = phase === "success";
  const reduceMotion = usePrefersReducedMotion();

  const description = idle
    ? "New project with this layout"
    : (label ?? "Working");

  return (
    <div className="relative shrink-0">
      <div
        className={`relative grid place-items-center h-8 w-8 touch-target rounded-full
                    material-thin transition-colors duration-150 ${
                      idle ? "text-muted" : "text-text"
                    }`}
      >
        {success && !reduceMotion && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full overflow-hidden"
          >
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 50%,
                    ${SUCCESS_COLOR} 0%,
                    color-mix(in srgb, ${SUCCESS_COLOR} 45%, transparent) 34%,
                    color-mix(in srgb, ${SUCCESS_COLOR} 12%, transparent) 58%,
                    transparent 76%)`,
                }}
                initial={{ opacity: 0, scale: 0.35 }}
                animate={{ opacity: [0, 1, 0], scale: [0.35, 1, 1.35] }}
                transition={{
                  duration: 0.95,
                  delay: i * 0.14,
                  ease: [0.22, 0.8, 0.3, 1],
                  times: [0, 0.4, 1],
                }}
              />
            ))}
            <motion.span
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0] }}
              transition={{ duration: 1.05, ease: "easeOut" }}
              style={{ boxShadow: `inset 0 0 0 1.5px ${SUCCESS_COLOR}` }}
            />
          </span>
        )}

        <AnimatePresence mode="popLayout" initial={false}>
          {idle ? (
            <motion.button
              key="idle"
              type="button"
              onClick={onCreateProject}
              disabled={!canCreate}
              aria-label={description}
              title={description}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileTap={busy ? undefined : { scale: 0.9 }}
              transition={motionPreset.snappy}
              className="relative z-10 grid h-8 w-8 place-items-center rounded-full
                         touch-target
                         text-muted hover:text-text hover:bg-hover
                         focus-visible:focus-ring active:opacity-70
                         disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={18} strokeWidth={2} />
            </motion.button>
          ) : (
            <motion.span
              key={busy ? `busy-${seq % 2}` : "success"}
              aria-hidden
              initial={{ opacity: 0, scale: 0.6, rotate: -25 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 25 }}
              transition={{ duration: 0.14, ease: "linear" }}
              className="relative z-10 grid place-items-center"
            >
              {busy ? (
                <ProgressRing progress={progress} />
              ) : (
                <span style={{ color: SUCCESS_COLOR }}>
                  <PixelIcon name="check" size={18} />
                </span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <span className="sr-only" aria-live="polite">
        {idle ? "" : description}
      </span>
    </div>
  );
};

const ProgressRing: React.FC<{ progress?: number }> = ({ progress }) => {
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const determinate = progress !== undefined;

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      className="text-muted"
      aria-hidden
    >
      <circle
        cx="9"
        cy="9"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.22}
        strokeWidth="2"
      />
      {determinate ? (
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform="rotate(-90 9 9)"
          style={{
            transition: "stroke-dashoffset 220ms cubic-bezier(0.32,0.72,0,1)",
          }}
        />
      ) : (
        <circle
          className="ring-sweep"
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.28} ${circumference}`}
        />
      )}
    </svg>
  );
};
