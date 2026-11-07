import type { PopoverAction } from "@/components/ui/PopoverMenu";
import {
  ArrowDownToLine,
  Copy,
  Crop,
  Download,
  Globe,
  Search,
  Upload,
} from "lucide-react";

export interface ImageActionHandlers {
  /** Open the crop studio for this artwork. */
  onAdjust?: () => void;
  /** Save the image to the device. */
  onDownload?: () => void;
  /** Put the image on the clipboard for another window or app. */
  onCopy?: () => void;
  /** Send the image back to the Library. */
  onReturnToLibrary?: () => void;
  /** Empty-position actions. */
  onChooseFile?: () => void;
  onFromUrl?: () => void;
  onSearchOnline?: () => void;
}

const can = (fn?: () => void) => typeof fn === "function";

/** Canonical order for a position that holds an image. */
export const filledImageActions = (h: ImageActionHandlers): PopoverAction[] => [
  ...(can(h.onAdjust)
    ? [{ label: "Crop & Adjust", icon: Crop, onClick: () => h.onAdjust!() }]
    : []),
  ...(can(h.onDownload)
    ? [
        {
          label: "Download",
          icon: Download,
          onClick: () => h.onDownload!(),
        },
      ]
    : []),
  ...(can(h.onCopy)
    ? [{ label: "Copy Image", icon: Copy, onClick: () => h.onCopy!() }]
    : []),
  ...(can(h.onReturnToLibrary)
    ? [
        {
          label: "Return to Library",
          icon: ArrowDownToLine,
          onClick: () => h.onReturnToLibrary!(),
          separator: true,
        },
      ]
    : []),
];

/** Canonical order for a position that is empty. */
export const emptyImageActions = (h: ImageActionHandlers): PopoverAction[] => [
  ...(can(h.onChooseFile)
    ? [{ label: "Choose File", icon: Upload, onClick: () => h.onChooseFile!() }]
    : []),
  ...(can(h.onFromUrl)
    ? [{ label: "From URL", icon: Globe, onClick: () => h.onFromUrl!() }]
    : []),
  ...(can(h.onSearchOnline)
    ? [
        {
          label: "Search Online",
          icon: Search,
          onClick: () => h.onSearchOnline!(),
        },
      ]
    : []),
];
