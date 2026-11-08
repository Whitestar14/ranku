import type { PopoverAction } from "@/components/ui/PopoverMenu";
import {
  ArrowDownToLine,
  Copy,
  Crop,
  Download,
  Globe,
  Info,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

export interface ImageActionHandlers {
  /** Open the crop overlay for this artwork. */
  onCropAdjust?: () => void;
  /** Save the image to the device. */
  onDownload?: () => void;
  /** Put the image on the clipboard for another window or app. */
  onCopy?: () => void;
  /** Open the details sheet. */
  onImageInfo?: () => void;
  /** Remove the image from the library. */
  onRemove?: () => void;
  /** Send the image back to the Library. */
  onReturnToLibrary?: () => void;
  /** Empty-position actions. */
  onChooseFile?: () => void;
  onFromUrl?: () => void;
  onSearchOnline?: () => void;
}

const can = (fn?: () => void) => typeof fn === "function";

/* Each action is defined once here. The board menu and the dock menu are
   assembled from the same pieces, so their labels, icons, and order cannot
   drift apart as either surface grows. */

const downloadAction = (h: ImageActionHandlers): PopoverAction[] =>
  can(h.onDownload)
    ? [
        {
          label: "Download",
          icon: Download,
          onClick: () => h.onDownload!(),
        },
      ]
    : [];

const copyAction = (h: ImageActionHandlers): PopoverAction[] =>
  can(h.onCopy)
    ? [{ label: "Copy Image", icon: Copy, onClick: () => h.onCopy!() }]
    : [];

const infoAction = (h: ImageActionHandlers): PopoverAction[] =>
  can(h.onImageInfo)
    ? [
        {
          label: "Image Info",
          icon: Info,
          separator: true,
          onClick: () => h.onImageInfo!(),
        },
      ]
    : [];

const removeAction = (h: ImageActionHandlers): PopoverAction[] =>
  can(h.onRemove)
    ? [
        {
          label: "Remove from Stash",
          icon: Trash2,
          variant: "danger" as const,
          separator: true,
          onClick: () => h.onRemove!(),
        },
      ]
    : [];

/** Canonical order for a board position that holds an image. */
export const filledImageActions = (h: ImageActionHandlers): PopoverAction[] => [
  ...(can(h.onCropAdjust)
    ? [
        {
          label: "Crop & Adjust",
          icon: Crop,
          onClick: () => h.onCropAdjust!(),
        },
      ]
    : []),
  ...downloadAction(h),
  ...copyAction(h),
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

/** Canonical order for an image in the library, where cropping does not apply. */
export const dockImageActions = (h: ImageActionHandlers): PopoverAction[] => [
  ...downloadAction(h),
  ...copyAction(h),
  ...infoAction(h),
  ...removeAction(h),
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
