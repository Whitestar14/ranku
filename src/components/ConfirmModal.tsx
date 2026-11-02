import React from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalActions } from "@/components/ui/ModalActions";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => (
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
          { label: "Confirm", tone: "danger", onClick: onConfirm },
        ]}
      />
    }
  />
);
