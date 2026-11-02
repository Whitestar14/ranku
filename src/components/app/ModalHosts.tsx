import React from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DuplicateModal } from "@/components/DuplicateModal";
import { ExportModal } from "@/components/ExportModal";
import { AboutModal } from "@/components/AboutModal";
import { useModalState } from "@/state/modalState";
import { useStore } from "@/store/useStore";
import type { ImageFormat } from "@/utils/imageUtils";

/*
 * One host per dialog. Each subscription lives here rather than in `AppContent`
 * so that opening a dialog does not re-render the whole app
 */

export const ExportModalHost: React.FC<{
  onExportImage: (
    format: ImageFormat,
    qualityScale: number,
    trimPadding: boolean,
  ) => void;
  onCopyImage: (qualityScale: number, trimPadding: boolean) => void;
}> = ({ onExportImage, onCopyImage }) => {
  const isOpen = useModalState((s) => s.isExportOpen);
  const close = useModalState((s) => s.closeExport);
  const trimPadding = useStore((s) => s.preferences.exportTrimmed ?? true);
  const format = useStore((s) => s.preferences.exportFormat ?? "png");
  const quality = useStore((s) => s.preferences.exportQuality ?? 2);
  const updatePreferences = useStore((s) => s.updatePreferences);
  return (
    <ExportModal
      isOpen={isOpen}
      onClose={close}
      onExportImage={onExportImage}
      onCopyImage={onCopyImage}
      trimPadding={trimPadding}
      onTrimPaddingChange={(trim) => updatePreferences({ exportTrimmed: trim })}
      format={format}
      quality={quality}
      onFormatChange={(value) => updatePreferences({ exportFormat: value })}
      onQualityChange={(value) => updatePreferences({ exportQuality: value })}
    />
  );
};

export const ConfirmModalHost: React.FC = () => {
  const confirm = useModalState((s) => s.confirm);
  const close = useModalState((s) => s.closeConfirm);
  return (
    <ConfirmModal
      isOpen={confirm.isOpen}
      title={confirm.title}
      message={confirm.message}
      toggle={confirm.toggle}
      onConfirm={confirm.onConfirm}
      onCancel={close}
    />
  );
};

export const AboutModalHost: React.FC = () => {
  const isOpen = useModalState((s) => s.isAboutOpen);
  const close = useModalState((s) => s.closeAbout);
  return <AboutModal isOpen={isOpen} onClose={close} />;
};

export const DuplicateModalHost: React.FC = () => {
  const config = useStore((s) => s.duplicateModalConfig);
  const onConfirm = useStore((s) => s.handleDuplicateConfirm);
  const setConfig = useStore((s) => s.setDuplicateModalConfig);
  return (
    <DuplicateModal
      isOpen={config.isOpen}
      imageSrc={config.imageSrc}
      onConfirm={onConfirm}
      onCancel={() =>
        setConfig({ isOpen: false, imageSrc: null, actionToExecute: null })
      }
    />
  );
};
