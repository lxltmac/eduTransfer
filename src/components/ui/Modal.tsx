"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
  disableAnimation?: boolean;
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    filter: "blur(10px)",
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    filter: "blur(5px)",
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
  disableAnimation = false,
}) => {
  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {disableAnimation ? (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm"
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
      ) : (
        <motion.div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
      )}
      {disableAnimation ? (
        <div
          className={cn(
            "relative bg-white rounded-3xl shadow-2xl w-full",
            "border border-slate-200/50",
            sizeStyles[size],
            className
          )}
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              {title && (
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className={cn(
                    "p-2 rounded-full transition-all duration-200",
                    "hover:bg-slate-100 active:scale-95",
                    "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}
          <div className="p-6">{children}</div>
        </div>
      ) : (
        <motion.div
          className={cn(
            "relative bg-white rounded-3xl shadow-2xl w-full",
            "border border-slate-200/50",
            sizeStyles[size],
            className
          )}
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              {title && (
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className={cn(
                    "p-2 rounded-full transition-all duration-200",
                    "hover:bg-slate-100 active:scale-95",
                    "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}
          <div className="p-6">{children}</div>
        </motion.div>
      )}
    </div>
  );

  if (disableAnimation) {
    return isOpen ? modalContent : null;
  }

  return (
    <AnimatePresence>
      {isOpen && modalContent}
    </AnimatePresence>
  );
};

export default Modal;
