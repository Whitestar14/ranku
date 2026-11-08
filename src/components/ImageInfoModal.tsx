import React, { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalActions } from "@/components/ui/ModalActions";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { useToast } from "@/context/ToastContext";
import type { InboxItem } from "@/types";
import {
  formatAdded,
  formatBytes,
  imageFileName,
  imageFormatLabel,
  imageSourceLabel,
  inlineImageBytes,
  isInlineImage,
} from "@/utils/imageInfo";

interface ImageInfoModalProps {
  isOpen: boolean;
  item: InboxItem | null;
  /** The collection it currently sits in, when that is known. */
  collectionName?: string;
  isOnBoard: boolean;
  onClose: () => void;
}

const CHECKERBOARD: React.CSSProperties = {
  backgroundColor: "var(--color-surface-secondary)",
  backgroundImage:
    "repeating-conic-gradient(var(--material-hairline) 0% 25%, transparent 0% 50%)",
  backgroundSize: "10px 10px",
};

const Row: React.FC<{
  label: string;
  value: React.ReactNode;
  /** Wraps long values instead of truncating, for names and links. */
  wrap?: boolean;
}> = ({ label, value, wrap }) => (
  <div className="flex items-start justify-between gap-4 px-4 py-2.5">
    <span className="shrink-0 text-footnote font-medium text-muted">
      {label}
    </span>
    <span
      className={`min-w-0 text-right text-footnote text-text ${
        wrap ? "break-all" : "truncate"
      }`}
    >
      {value}
    </span>
  </div>
);

export const ImageInfoModal: React.FC<ImageInfoModalProps> = ({
  isOpen,
  item,
  collectionName,
  isOnBoard,
  onClose,
}) => {
  const addToast = useToast();
  const [dimensions, setDimensions] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  /* The natural size is not stored with the artwork, so it is read off the
     preview element that the sheet already decodes. */
  useEffect(() => {
    setDimensions(null);
    setPreviewFailed(false);
  }, [item]);

  if (!item) return null;

  const inline = isInlineImage(item.imageSrc);
  const bytes = inlineImageBytes(item.imageSrc);
  const isRemote = !inline;

  const copyLink = () => {
    if (!navigator.clipboard) {
      addToast("error", "Could not copy the link");
      return;
    }
    void navigator.clipboard
      .writeText(item.imageSrc)
      .then(() => addToast("success", "Image link copied"))
      .catch(() => addToast("error", "Could not copy the link"));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Image Info"
      description="Everything stored about this image"
      className="max-w-md"
      contentClassName="p-0"
      footer={
        <ModalActions
          actions={[{ label: "Done", tone: "muted", onClick: onClose }]}
        />
      }
      footerFlush
    >
      <div className="flex flex-col">
        <div
          className="flex h-44 items-center justify-center overflow-hidden"
          style={CHECKERBOARD}
        >
          {previewFailed ? (
            <span className="px-6 text-center text-footnote font-medium text-destructive">
              This image could not be loaded
            </span>
          ) : (
            <RemoteImage
              key={item.id}
              src={item.imageSrc}
              alt=""
              fit="contain"
              decoding="async"
              className="h-full w-full"
              onLoad={(event) => {
                const image = event.currentTarget;
                setDimensions(`${image.naturalWidth} × ${image.naturalHeight}`);
              }}
              onError={() => {
                setDimensions("Unreadable");
                setPreviewFailed(true);
              }}
            />
          )}
        </div>

        <div className="divide-y divide-hairline border-y border-hairline">
          <Row label="Name" value={imageFileName(item.imageSrc)} wrap />
          <Row label="Source" value={imageSourceLabel(item.imageSrc)} />
          <Row label="Format" value={imageFormatLabel(item.imageSrc)} />
          <Row label="Dimensions" value={dimensions ?? "Reading…"} />
          <Row
            label="Size"
            value={bytes != null ? formatBytes(bytes) : inline ? "—" : "Remote"}
          />
          {collectionName && (
            <Row label="Collection" value={collectionName} wrap />
          )}
          <Row label="Added" value={formatAdded(item.createdAt)} />
          <Row label="On board" value={isOnBoard ? "Yes" : "No"} />
          {isRemote && (
            <Row
              label="Link"
              wrap
              value={
                <span className="inline-flex max-w-full items-start gap-1.5">
                  <span className="break-all text-muted">{item.imageSrc}</span>
                  <button
                    type="button"
                    onClick={copyLink}
                    aria-label="Copy image link"
                    className="mt-0.5 shrink-0 rounded-hairline p-0.5 text-muted
                               transition-colors hover:text-text"
                  >
                    <Copy size={13} strokeWidth={2.2} />
                  </button>
                </span>
              }
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
