"use client";

import React from "react";
import { AlertTriangle, XCircle } from "lucide-react";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  dialogType?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确定',
  cancelText = '取消',
  dialogType = 'warning',
}) => {
  console.log('ConfirmDialog props:', { visible, title, message, dialogType });
  
  if (!visible) return null;

  const typeStyles = {
    danger: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: <XCircle className="text-red-500" size={24} />,
      confirmBtn: 'bg-red-500 hover:bg-red-600 text-white',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertTriangle className="text-yellow-500" size={24} />,
      confirmBtn: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: <AlertTriangle className="text-blue-500" size={24} />,
      confirmBtn: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
  };

  const style = typeStyles[dialogType];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className={`relative ${style.bg} rounded-2xl p-6 max-w-sm w-full shadow-xl border`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">{style.icon}</div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${style.text} mb-2`}>{title}</h3>
            <p className={`text-sm ${style.text} opacity-80`}>{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl ${style.confirmBtn} font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
