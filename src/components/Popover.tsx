import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface PopoverContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleOpen: () => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = createContext<PopoverContextType | null>(null);

function usePopoverContext() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error("Popover sub-components must be rendered within a Popover");
  }
  return context;
}

export interface PopoverProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  children,
  defaultOpen = false,
  onOpenChange,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  };

  const close = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        close();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isOpen]);

  return (
    <PopoverContext.Provider
      value={{ isOpen, setIsOpen, toggleOpen, close, triggerRef, popoverRef }}
    >
      <div className="inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

export interface PopoverTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export function PopoverTrigger({
  children,
  className = "",
  ...props
}: PopoverTriggerProps) {
  const { toggleOpen, triggerRef } = usePopoverContext();

  return (
    <div
      ref={triggerRef}
      onClick={toggleOpen}
      className={`inline-block cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}

/**
 * Rendered through a portal on `document.body`, which is why it carries
 * `data-row-click-stop`: inside a `DataTable` row, a click that lands here would otherwise
 * bubble to the row and navigate it. See `DataTable`'s own D14 comment for the protocol.
 */
export function PopoverContent({
  children,
  className = "",
  align = "right",
  ...props
}: PopoverContentProps) {
  const { isOpen, popoverRef, triggerRef } = usePopoverContext();
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = popoverRef.current?.offsetWidth || 320; // fallback width

      let left = rect.left;
      if (align === "right") {
        left = rect.right - popoverWidth;
      } else if (align === "center") {
        left = rect.left + rect.width / 2 - popoverWidth / 2;
      }

      setCoords({
        top: rect.bottom + window.scrollY + 8, // 8px gap below trigger
        left: left + window.scrollX,
      });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, align, triggerRef, popoverRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      // Invariant 12, and the fix for prep §1. A popover inside a clickable row must not
      // navigate that row. `DataTable` checks `event.target.closest(...)`, which walks the
      // real DOM — so the opt-out has to be on the PORTAL, not on the component that
      // renders the trigger. React bubbles this click through the React tree from
      // `document.body` up to the `DataTable` row, and without this attribute that
      // `closest()` call finds nothing and the row navigates.
      //
      // It is safe to put it here rather than at each call site: the attribute is inert
      // everywhere except inside `DataTable`'s row handler, and a caller that wants the
      // row to navigate can override it through `{...props}` below.
      data-row-click-stop
      className={`z-9999 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-4 ${className}`}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}
