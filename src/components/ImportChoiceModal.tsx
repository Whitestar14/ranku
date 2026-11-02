import React from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalActions } from "@/components/ui/ModalActions";

interface ImportChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: "merge" | "overwrite") => void;
  isUntouchedWorkspace?: boolean;
}

export const ImportChoiceModal: React.FC<ImportChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isUntouchedWorkspace = false,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    variant="action"
    title="Restore Backup"
    description={
      isUntouchedWorkspace
        ? "This workspace is empty, restore backup?"
        : "How should this file be applied?"
    }
    contentClassName="pt-3 text-center"
    footer={
      <ModalActions
        actions={
          isUntouchedWorkspace
            ? [
                {
                  label: "Restore",
                  onClick: () => onSelect("overwrite"),
                },
                { label: "Cancel", tone: "muted", onClick: onClose },
              ]
            : [
                { label: "Merge Data", onClick: () => onSelect("merge") },
                {
                  label: "Overwrite All",
                  tone: "danger",
                  onClick: () => onSelect("overwrite"),
                },
                { label: "Cancel", tone: "muted", onClick: onClose },
              ]
        }
      />
    }
  ></Modal>
);
