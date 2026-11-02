import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ImageFormat } from "@/utils/imageUtils";
import { FileImage, Copy } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportImage: (
    format: ImageFormat,
    qualityScale: number,
    trimPadding: boolean,
  ) => void;
  onCopyImage?: (qualityScale: number, trimPadding: boolean) => void;
  trimPadding: boolean;
  onTrimPaddingChange: (trim: boolean) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportImage,
  onCopyImage,
  trimPadding,
  onTrimPaddingChange,
}) => {
  const [format, setFormat] = useState<ImageFormat>("png");
  const [quality, setQuality] = useState<number>(2);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Project"
      description="Choose how you want to save your work."
      className="max-w-[320px]"
      contentClassName="flex flex-col gap-4"
      footerFlush
      footer={
        <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
          <Button
            fullWidth
            size="lg"
            icon={<FileImage size={18} />}
            onClick={() => {
              onExportImage(format, quality, trimPadding);
              onClose();
            }}
          >
            Save as Image
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="gray"
            icon={<Copy size={18} />}
            onClick={() => {
              if (onCopyImage) onCopyImage(quality, trimPadding);
              onClose();
            }}
          >
            Copy to Clipboard
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <span className="text-caption-2 font-semibold text-muted uppercase tracking-[0.05em]">
          Image Format
        </span>
        <SegmentedControl
          value={format}
          onChange={(val) => setFormat(val as ImageFormat)}
          options={[
            { value: "png", label: "PNG" },
            { value: "jpeg", label: "JPG" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption-2 font-semibold text-muted uppercase tracking-[0.05em]">
          Frame
        </span>
        <SegmentedControl
          value={trimPadding ? "trim" : "board"}
          onChange={(val) => onTrimPaddingChange(val === "trim")}
          options={[
            { value: "trim", label: "Trimmed" },
            { value: "board", label: "Padded" },
          ]}
        />
        <p className="text-caption-1 text-muted leading-snug">
          {trimPadding
            ? "The image ends where your artwork does."
            : "Keeps the board's margin around the artwork."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption-2 font-semibold text-muted uppercase tracking-[0.05em]">
          Export Quality
        </span>
        <SegmentedControl
          value={quality.toString()}
          onChange={(val) => setQuality(parseInt(val))}
          options={[
            { value: "1", label: "1x (SD)" },
            { value: "2", label: "2x (HD)" },
            { value: "3", label: "3x (4K)" },
          ]}
        />
      </div>
    </Modal>
  );
};
