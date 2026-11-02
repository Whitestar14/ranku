import React from "react";
import { cn } from "@/utils";

export interface ModalAction {
  label: string;
  onClick: () => void;
  tone?: "primary" | "danger" | "muted";
  disabled?: boolean;
}

const TONES = {
  primary: "text-primary font-medium",
  danger: "text-destructive font-medium",
  muted: "text-muted font-medium",
} as const;

const isDismiss = (action: ModalAction) => action.tone === "muted";

/**
 * The order of dialog actions is a convention, not a per-dialog choice: a row
 * reads dismiss → commit, and a stack reads commit → dismiss. Sorting here means
 * a new dialog cannot get it backwards.
 */
function ordered(actions: ModalAction[], stack: boolean): ModalAction[] {
  return actions
    .map((action, index) => ({ action, index }))
    .sort((a, b) => {
      const dismiss = Number(isDismiss(a.action)) - Number(isDismiss(b.action));
      if (dismiss !== 0) return stack ? dismiss : -dismiss;
      return a.index - b.index;
    })
    .map(({ action }) => action);
}

export const ModalActions: React.FC<{ actions: ModalAction[] }> = ({
  actions,
}) => {
  const cell =
    "flex-1 py-3.5 text-body text-center transition-colors hover:bg-hover " +
    "active:bg-black/5 dark:active:bg-white/5 disabled:opacity-35 disabled:pointer-events-none";

  if (actions.length === 2) {
    return (
      <div className="flex border-t border-hairline">
        {ordered(actions, false).map((action, i) => (
          <button
            key={action.label}
            type="button"
            disabled={action.disabled}
            onClick={action.onClick}
            className={cn(
              cell,
              i > 0 && "border-l border-hairline",
              TONES[action.tone ?? "primary"],
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="border-t border-hairline">
      {ordered(actions, true).map((action, i) => (
        <button
          key={action.label}
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          className={cn(
            "block w-full py-3.5 text-body transition-colors",
            "hover:bg-hover active:bg-black/5 dark:active:bg-white/5",
            "disabled:opacity-35 disabled:pointer-events-none",
            i > 0 && "border-t border-hairline",
            TONES[action.tone ?? "primary"],
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};
