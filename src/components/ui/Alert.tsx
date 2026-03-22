"use client";

import React from "react";
import { motion } from "framer-motion";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AlertProps {
  type?: "success" | "error" | "warning" | "info";
  message?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const typeStyles = {
  success: "bg-green-100 text-green-800 border-green-300",
  error: "bg-red-100 text-red-800 border-red-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  info: "bg-blue-100 text-blue-800 border-blue-300",
};

const fadeInBlur = {
  initial: { opacity: 0, filter: "blur(10px)", y: 10 },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: 0.2, ease: "easeInOut" },
  },
};

const Alert: React.FC<AlertProps> = ({
  type = "info",
  message = "This is an alert message.",
  onClick,
}) => {
  return (
    <motion.div
      className={cn(
        "fixed top-6 left-1/2 -translate-x-1/2 z-[9999]",
        "border px-5 py-3 flex items-center gap-2 rounded-2xl shadow-lg text-base font-medium min-w-[240px] max-w-md justify-center",
        typeStyles[type]
      )}
      role="alert"
      variants={fadeInBlur}
      initial="initial"
      animate="animate"
      onClick={onClick}
    >
      <span className="font-bold capitalize">{type}:</span>
      <span>{message}</span>
    </motion.div>
  );
};

export default Alert;
