import toast from 'react-hot-toast';

// Custom toast styles matching our theme
const toastOptions = {
  success: {
    duration: 4000,
    style: {
      background: '#10B981',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
  },
  error: {
    duration: 5000,
    style: {
      background: '#EF4444',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
  },
  loading: {
    style: {
      background: '#3B82F6',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#3B82F6',
    },
  },
  info: {
    duration: 4000,
    style: {
      background: '#3B82F6',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#3B82F6',
    },
  },
  warning: {
    duration: 4000,
    style: {
      background: '#F59E0B',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#F59E0B',
    },
  },
};

// Simplified toast functions
export const showToast = {
  success: (message: string) => toast.success(message, toastOptions.success),
  error: (message: string) => toast.error(message, toastOptions.error),
  loading: (message: string) => toast.loading(message, toastOptions.loading),
  info: (message: string) => toast(message, toastOptions.info),
  warning: (message: string) => toast(message, toastOptions.warning),
  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) =>
    toast.promise(
      promise,
      {
        loading,
        success,
        error,
      },
      {
        success: toastOptions.success,
        error: toastOptions.error,
        loading: toastOptions.loading,
      }
    ),
};
