import { type ReactNode, useCallback, useEffect } from "react";

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  isLocked?: boolean;
  children: ReactNode;
};

export function Drawer({ isOpen, onClose, isLocked = false, children }: DrawerProps) {
  const handleClose = useCallback(() => {
    if (!isLocked) onClose();
  }, [isLocked, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-base-200 shadow-2xl z-50 flex flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
