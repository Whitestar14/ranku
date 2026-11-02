import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalActions } from "@/components/ui/ModalActions";
import { Toggle } from "@/components/ui/Toggle";

interface DuplicateModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}

export const DuplicateModal: React.FC<DuplicateModalProps> = ({
  isOpen,
  imageSrc,
  onConfirm,
  onCancel,
}) => {
  const [dontAsk, setDontAsk] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      variant="action"
      title="Duplicate Item"
      description="This image is already in your current project. Add it again?"
      contentClassName="flex flex-col items-center gap-4 pt-4"
      footer={
        <ModalActions
          actions={[
            { label: "Cancel", tone: "muted", onClick: onCancel },
            { label: "Add", onClick: () => onConfirm(dontAsk) },
          ]}
        />
      }
    >
      {imageSrc && (
        <div className="w-16 h-20 rounded-control overflow-hidden border border-hairline">
          <img src={imageSrc} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <button
        type="button"
        onClick={() => setDontAsk(!dontAsk)}
        className="flex w-full items-center justify-between gap-2 rounded-chip px-1 pt-1
                   text-footnote text-text select-none"
      >
        <span>Don't ask again</span>
        <Toggle
          aria-label="Don't ask again"
          checked={dontAsk}
          onCheckedChange={setDontAsk}
        />
      </button>
    </Modal>
  );
};
