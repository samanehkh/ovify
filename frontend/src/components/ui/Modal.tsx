import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
      
      // Store current active element to restore focus later
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the modal content area for screen readers
      if (modalRef.current) {
        modalRef.current.focus();
      }

      // Escape key and Tab focus trap handlers
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key === 'Tab' && modalRef.current) {
          const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
          const focusableElements = Array.from(
            modalRef.current.querySelectorAll(focusableSelectors)
          ) as HTMLElement[];

          if (focusableElements.length === 0) {
            e.preventDefault();
            return;
          }

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            // Shift + Tab: trap back to last element if focus is on first or container
            if (document.activeElement === firstElement || document.activeElement === modalRef.current) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            // Tab: loop to first if on last element
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
        
        // Restore focus to previous trigger
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-5 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-white border border-navy-10 rounded-3xl p-6 shadow-xl max-w-sm w-full text-center relative animate-scale-up cursor-default outline-none focus:ring-2 focus:ring-lavender"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="modal-title" className="font-heading text-base font-bold text-navy mb-2">
          {title}
        </h4>
        <div className="mt-2">
          {children}
        </div>
      </div>
    </div>
  );
};
