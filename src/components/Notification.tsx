import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { NotificationType } from '../types';

interface NotificationProps {
  notifications: NotificationType[];
  onDismiss: (id: string) => void;
}

export default function Notification({ notifications, onDismiss }: NotificationProps) {
  return (
    <div className="fixed top-5 right-5 left-5 md:left-auto md:w-80 z-[600] space-y-3 pointer-events-none">
      {notifications.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: NotificationType;
  onDismiss: (id: string) => void;
  key?: string;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const config = {
    success: {
      bg: 'bg-emerald-600 border-emerald-500 shadow-emerald-900/10',
      icon: <CheckCircle2 className="w-5 h-5 text-white shrink-0" />,
    },
    error: {
      bg: 'bg-rose-600 border-rose-500 shadow-rose-900/10',
      icon: <AlertCircle className="w-5 h-5 text-white shrink-0" />,
    },
    info: {
      bg: 'bg-blue-600 border-blue-500 shadow-blue-900/10',
      icon: <Info className="w-5 h-5 text-white shrink-0" />,
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-xl text-white border animate-toast ${config.bg} transform transition duration-300`}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <span className="font-bold text-sm leading-tight text-white">{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-white/80 hover:text-white hover:bg-white/15 p-1 rounded-lg transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
