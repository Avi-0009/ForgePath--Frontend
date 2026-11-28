import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onCancel: () => void;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  alert?: boolean;
  drawer?: boolean;
  returnFocusId?: string;
};

// The browser top layer makes background content inert and contains focus.
const NativeModal = ({ children, onCancel, label, labelledBy, describedBy, alert, drawer, returnFocusId }: Props) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-safe-focus]")?.focus();
    return () => {
      if (dialog.open) dialog.close();
      requestAnimationFrame(() => {
        if (dialog.open || document.querySelector("dialog:modal")) return;
        const active = document.activeElement;
        if (active && active !== document.body && active !== dialog && !dialog.contains(active) && active !== previous) return;
        const target = (returnFocusId ? document.getElementById(returnFocusId) : previous);
        if (target?.isConnected && !target.matches(":disabled") && target.getClientRects().length) {
          target.focus({ preventScroll: true });
        } else {
          document.getElementById("forgepath-main-content")?.focus({ preventScroll: true });
        }
      });
    };
  }, [returnFocusId]);

  return (
    <dialog
      ref={ref}
      role={alert ? "alertdialog" : undefined}
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={drawer ? "forgepath-drawer" : "forgepath-modal"}
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const dialog = event.currentTarget;
        const elements = Array.from(dialog.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]',
        )).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") &&
          !element.closest("[inert]") && element.getClientRects().length > 0 &&
          getComputedStyle(element).visibility !== "hidden");
        const first = elements[0];
        const last = elements.at(-1);
        if (!first || !last) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }}
      onClick={drawer ? (event) => { if (event.target === event.currentTarget) onCancel(); } : undefined}
    >
      {children}
    </dialog>
  );
};

export default NativeModal;
