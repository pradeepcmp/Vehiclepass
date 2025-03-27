"use client"
import React, { useState, useEffect, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Types for our notification system
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // Duration in ms, defaults to 5000ms
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Context for the notification system
interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Hook to use the notification system
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Provider component for the notification system
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    };
    
    setNotifications((prev) => [...prev, newNotification]);
    
    // Auto dismiss after duration (if not 0)
    if (newNotification.duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, newNotification.duration);
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, dismissNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Container component for displaying notifications
const NotificationContainer = () => {
  const { notifications, dismissNotification } = useNotification();
  
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-4 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto"
          >
            <NotificationItem
              notification={notification}
              onDismiss={() => dismissNotification(notification.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual notification item component
const NotificationItem: React.FC<{
  notification: Notification;
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  // Get icon and colors based on notification type
  const getTypeStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          iconSvg: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          bgGradient: 'from-green-50 to-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          iconBg: 'bg-green-400',
          progressColor: 'bg-green-500',
        };
      case 'error':
        return {
          iconSvg: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          bgGradient: 'from-red-50 to-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-400',
          progressColor: 'bg-red-500',
        };
      case 'warning':
        return {
          iconSvg: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          bgGradient: 'from-amber-50 to-amber-100',
          textColor: 'text-amber-800',
          borderColor: 'border-amber-200',
          iconBg: 'bg-amber-400',
          progressColor: 'bg-amber-500',
        };
      case 'info':
      default:
        return {
          iconSvg: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bgGradient: 'from-blue-50 to-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          iconBg: 'bg-blue-400',
          progressColor: 'bg-blue-500',
        };
    }
  };

  const styles = getTypeStyles(notification.type);
  
  // Progress bar animation state
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - (100 / (notification.duration || 5000) * 100);
          return newProgress < 0 ? 0 : newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [notification.duration]);

  return (
    <div className={`rounded-lg border shadow-lg overflow-hidden bg-gradient-to-br ${styles.bgGradient} ${styles.borderColor} ${styles.textColor} relative`}>
      <div className="flex items-start p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.iconBg} text-white p-2 rounded-full mr-3`}>
          {styles.iconSvg}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h5 className="font-semibold text-base mb-1">{notification.title}</h5>
          <p className="text-sm opacity-90">{notification.message}</p>
          
          {/* Action button */}
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 px-3 py-1 text-sm font-medium rounded-md bg-white bg-opacity-30 hover:bg-opacity-50 transition-colors"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 ml-2 text-gray-600 hover:text-gray-800 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Progress bar */}
      {notification.duration && notification.duration > 0 && (
        <div className="h-1 w-full bg-gray-200 bg-opacity-30">
          <div
            className={`h-full ${styles.progressColor}`}
            style={{ width: `${progress}%`, transition: 'width 100ms linear' }}
          />
        </div>
      )}
      
      {/* Glossy effect overlay */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white to-transparent opacity-50 pointer-events-none"></div>
    </div>
  );
};

export default NotificationProvider;