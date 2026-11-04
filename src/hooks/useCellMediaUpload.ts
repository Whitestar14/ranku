import { useRef, useCallback } from "react";
import { readFileAsDataURL } from "@/utils/imageFile";
import { useToast } from "@/context/ToastContext";

/**
 * The file picker behind a tile's "choose image" action.
 */
export function useCellMediaUpload(onUploadSuccess: (base64: string) => void) {
  const addToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onSuccessRef = useRef(onUploadSuccess);
  onSuccessRef.current = onUploadSuccess;

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Let the same file be chosen twice in a row.
      if (e.target) e.target.value = "";
      if (!file) return;

      void readFileAsDataURL(file)
        .then((src) => onSuccessRef.current(src))
        .catch(() => addToast("error", "Could not read that image"));
    },
    [addToast],
  );

  const triggerPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    fileInputRef,
    triggerPicker,
    handleFileChange,
  };
}
