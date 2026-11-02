import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalActions } from "@/components/ui/ModalActions";
import { isValidImageUrl } from "@/utils/url";

interface UrlInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

export const UrlInputModal: React.FC<UrlInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [url, setUrl] = useState("");
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setUrl("");
    setShowError(false);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const trimmed = url.trim();
  const isValid = isValidImageUrl(trimmed);

  const handleSubmit = () => {
    if (!isValid) {
      setShowError(trimmed.length > 0);
      return;
    }
    onSubmit(trimmed);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="action"
      title="Image URL"
      description="Paste a direct link to any image."
      contentClassName="pt-4"
      footer={
        <ModalActions
          actions={[
            { label: "Cancel", tone: "muted", onClick: onClose },
            { label: "Add", disabled: !isValid, onClick: handleSubmit },
          ]}
        />
      }
    >
      <input
        ref={inputRef}
        type="url"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          if (showError) setShowError(false);
        }}
        onBlur={() => setShowError(trimmed.length > 0 && !isValid)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder="https://…"
        aria-label="Image URL"
        aria-invalid={showError || undefined}
        aria-describedby={showError ? "image-url-error" : undefined}
        className={`h-10 w-full rounded-chip border bg-surface-secondary px-3
                   text-subheadline text-text placeholder:text-faint outline-none
                   transition-colors focus:bg-surface-elevated ${
                     showError
                       ? "border-destructive focus:border-destructive"
                       : "border-transparent focus:border-border"
                   }`}
      />
      {showError && (
        <p
          id="image-url-error"
          role="alert"
          className="mt-2 text-caption-1 text-destructive leading-snug"
        >
          Enter a full image URL starting with http:// or https://.
        </p>
      )}
    </Modal>
  );
};
