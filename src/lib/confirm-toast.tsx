import { toast } from "sonner";

/** In-app confirmation using a toast instead of the browser's confirm() box. */
export function confirmToast(message: string, confirmLabel = "Delete"): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => { if (!done) { done = true; resolve(v); } };
    toast.warning(message, {
      duration: 10000,
      action: { label: confirmLabel, onClick: () => finish(true) },
      cancel: { label: "Cancel", onClick: () => finish(false) },
      onDismiss: () => finish(false),
      onAutoClose: () => finish(false),
    });
  });
}
