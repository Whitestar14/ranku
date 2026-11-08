import { useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import {
  copyImageToClipboard,
  downloadImage as saveImageFile,
} from "@/utils/imageTransfer";

/**
 * The download and copy behaviours every image surface shares, including the
 * toast wording. The board menu, the dock menu, and the keyboard shortcut all
 * route through here so they cannot drift apart.
 */
export function useImageTransferActions() {
  const addToast = useToast();

  const copyImage = useCallback(
    (src: string) => {
      if (!src) return;
      void copyImageToClipboard(src).then((ok) =>
        addToast(
          ok ? "success" : "error",
          ok ? "Image copied!" : "Could not copy this image",
        ),
      );
    },
    [addToast],
  );

  const downloadImage = useCallback((src: string, filename: string) => {
    if (!src) return;
    void saveImageFile(src, filename);
  }, []);

  return { copyImage, downloadImage };
}
