import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalActions } from "@/components/ui/ModalActions";
import { Toggle } from "@/components/ui/Toggle";
import type { ConfirmToggle } from "@/state/modalState";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  toggle?: ConfirmToggle;
  onConfirm: (checked: boolean) => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  toggle,
  onConfirm,
  onCancel,
}) => {
  const [checked, setChecked] = useState(toggle?.defaultOn ?? false);

  useEffect(() => {
    if (isOpen) setChecked(toggle?.defaultOn ?? false);
  }, [isOpen, toggle]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      variant="action"
      title={title}
      description={message}
      footer={
        <ModalActions
          actions={[
            { label: "Cancel", tone: "muted", onClick: onCancel },
            {
              label: "Confirm",
              tone: "danger",
              onClick: () => onConfirm(checked),
            },
          ]}
        />
      }
    >
      {toggle ? (
        <div className="flex mt-2 items-center justify-between gap-3 rounded-control bg-surface-secondary/60 px-3 py-2.5 text-left">
          <div className="min-w-0">
            <p className="text-footnote font-medium text-text leading-snug">
              {toggle.label}
            </p>
            {toggle.hint && (
              <p className="mt-0.5 text-caption-1 text-muted leading-snug">
                {toggle.hint}
              </p>
            )}
          </div>
          <Toggle
            checked={checked}
            onCheckedChange={setChecked}
            aria-label={toggle.label}
          />
        </div>
      ) : undefined}
    </Modal>
  );
};
