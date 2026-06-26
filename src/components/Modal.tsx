import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { IconButton } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const originalFocusedElement = document.activeElement as HTMLElement;

    if (firstElement) {
      firstElement.focus();
    } else {
      modalRef.current?.focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleTab);
    return () => {
      window.removeEventListener('keydown', handleTab);
      if (originalFocusedElement) {
        originalFocusedElement.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start sm:items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          tabIndex={-1}
          className={cn(
            'relative w-full bg-white dark:bg-card rounded-2xl shadow-2xl animate-fade-in flex flex-col max-h-[90vh] outline-none',
            sizes[size]
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-foreground/10 shrink-0">
              <h2 id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-foreground">{title}</h2>
              <IconButton onClick={onClose} variant="ghost" size="sm" aria-label="Close modal">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
          )}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  const drawerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;

    const focusableElements = drawerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const originalFocusedElement = document.activeElement as HTMLElement;

    if (firstElement) {
      firstElement.focus();
    } else {
      drawerRef.current?.focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleTab);
    return () => {
      window.removeEventListener('keydown', handleTab);
      if (originalFocusedElement) {
        originalFocusedElement.focus();
      }
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : undefined}
        tabIndex={-1}
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-card shadow-2xl z-50 transform transition-transform duration-300 ease-out outline-none',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-foreground/10">
            <h2 id="drawer-title" className="text-lg font-semibold text-slate-900 dark:text-foreground">{title}</h2>
            <IconButton onClick={onClose} variant="ghost" size="sm" aria-label="Close drawer">
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        )}
        <div className="h-[calc(100vh-73px)] overflow-y-auto scrollbar-thin p-6">
          {children}
        </div>
      </div>
    </>
  );
}

interface ToastProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  };
  onClose: () => void;
}

export function Toast({ notification, onClose }: ToastProps) {
  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-300',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-300',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-300',
  };

  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isError = notification.type === 'error';

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border animate-slide-in',
        typeStyles[notification.type]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-medium">{notification.title}</p>
          <p className="text-sm opacity-80">{notification.message}</p>
        </div>
        <button onClick={onClose} className="hover:opacity-70" aria-label="Close notification">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
