import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserFlowState, TargetModule, LocationType, AppNotification } from '../types';

const initialState: UserFlowState = {
  theme: 'light',
  targets: [],
  locationType: null,
  area: 100,
  usableArea: 70,
  city: '',
  gridConnected: true,
  gridStable: true,
  appliances: [],
  essentialAppliances: [],
  supportHours: 2,
  actualMonthlyKwh: null,

  notifications: [
    {
      id: 'n1',
      title: 'وضعیت درخواست احداث نیروگاه',
      message: 'درخواست شما برای احداث نیروگاه خورشیدی مسکونی ثبت شد.',
      type: 'info',
      isRead: false,
      date: new Date().toISOString()
    },
    {
      id: 'n2',
      title: 'تایید سفارش خرید تجهیزات',
      message: 'سفارش خرید تجهیزات خورشیدی شما توسط فروشگاه تایید شد.',
      type: 'success',
      isRead: false,
      date: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'n3',
      title: 'تعمیرکار هوشمند اختصاص یافت',
      message: 'متخصص فنی جهت سرویس دوره‌ای تجهیزات شما تعیین گردید.',
      type: 'warning',
      isRead: false,
      date: new Date(Date.now() - 86400000).toISOString()
    }
  ],
};

interface AppContextType {
  state: UserFlowState;
  updateState: (updates: Partial<UserFlowState>) => void;
  resetState: () => void;
  toggleTheme: () => void;

  markNotificationAsRead: (id: string) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'date' | 'isRead'>) => void;
  markAllNotificationsAsRead: () => void;

}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserFlowState>(initialState);

  
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  const updateState = (updates: Partial<UserFlowState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  
  const markNotificationAsRead = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      )
    }));
  };

  const markAllNotificationsAsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, isRead: true }))
    }));
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'date' | 'isRead'>) => {
    setState(prev => ({
      ...prev,
      notifications: [
        {
          ...notif,
          id: Math.random().toString(36).substring(2, 9),
          date: new Date().toISOString(),
          isRead: false
        },
        ...prev.notifications
      ]
    }));
  };

  
  const toggleTheme = () => {
    setState(prev => {
      const newTheme = prev.theme === 'light' ? 'dark' : 'light';
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { ...prev, theme: newTheme };
    });
  };

  const resetState = () => setState(initialState);


  return (
    <AppContext.Provider value={{ state, updateState, resetState, toggleTheme, markNotificationAsRead, addNotification, markAllNotificationsAsRead }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
