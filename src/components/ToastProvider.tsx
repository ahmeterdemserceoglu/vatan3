'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, X, ShieldOff } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'permission';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    showPermissionError: (message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const showPermissionError = useCallback((message?: string) => {
        showToast(
            message || 'Bu işlem için izniniz yok',
            'permission',
            5000
        );
    }, [showToast]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        toasts.forEach(toast => {
            const timer = setTimeout(() => {
                removeToast(toast.id);
            }, toast.duration || 4000);
            timers.push(timer);
        });

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [toasts, removeToast]);

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success':
                return <CheckCircle size={20} className="text-emerald-500" />;
            case 'error':
                return <AlertCircle size={20} className="text-red-500" />;
            case 'permission':
                return <ShieldOff size={20} className="text-orange-500" />;
            default:
                return <Info size={20} className="text-blue-500" />;
        }
    };

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'success':
                return 'bg-emerald-50 border-emerald-200 text-emerald-800';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'permission':
                return 'bg-orange-50 border-orange-200 text-orange-800';
            default:
                return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showPermissionError }}>
            {children}

            {/* Toast Container - Sağ alt köşe */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-300 ${getStyles(toast.type)}`}
                    >
                        {getIcon(toast.type)}
                        <p className="flex-1 text-sm font-medium">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
