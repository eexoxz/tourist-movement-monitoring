import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { translate, type Locale } from "../services/i18n";

export function PlaceGuideDialog({ title, locale, children, onClose, closeLabel, className = "" }: { title: string; locale: Locale; children: ReactNode; onClose: () => void; closeLabel?: string; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className={`place-guide-dialog ${className}`} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <div className="place-guide-dialog-bar"><strong>{title}</strong><button type="button" className="icon-action" autoFocus aria-label={closeLabel ?? translate(locale, "map.closePlaceDetails")} title={closeLabel ?? translate(locale, "map.closePlaceDetails")} onClick={onClose}><X size={20} /></button></div>
    {children}
  </dialog>;
}
