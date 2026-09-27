import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle, Trash2, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationCenter() {
  const { state, markNotificationAsRead, markAllNotificationsAsRead } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = state.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'error': return <XCircle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-inherit hover:bg-black/5 dark:hover:bg-white dark:bg-zinc-900/10 transition-colors focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-premium border border-zinc-200 dark:border-zinc-800 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
                اعلانات
                {unreadCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">
                    {unreadCount} جدید
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-[11px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                >
                  <Check size={14} />
                  خواندن همه
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 flex flex-col items-center">
                  <Bell size={32} className="opacity-20 mb-3" />
                  <p className="text-sm">هیچ اعلانی ندارید</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => !notif.isRead && markNotificationAsRead(notif.id)}
                      className={`p-4 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 cursor-pointer transition-colors ${
                        notif.isRead ? 'bg-white dark:bg-zinc-900 opacity-70' : 'bg-emerald-50/30 dark:bg-emerald-900/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/40'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="shrink-0 mt-0.5">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`text-sm font-bold ${notif.isRead ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-900 dark:text-white'}`}>
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5">
                              {formatDate(notif.date)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 text-center border-t border-zinc-100 dark:border-zinc-800">
                <button className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:text-white transition-colors">
                  مشاهده همه تاریخچه
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
