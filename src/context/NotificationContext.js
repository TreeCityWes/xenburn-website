import React, { createContext, useContext } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const notify = (message, type = 'info') => {
    return toast[type](message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  const updateNotification = (id, message, type = 'info') => {
    toast.update(id, {
      render: message,
      type,
      autoClose: 5000
    });
  };

  const dismissNotification = (id) => {
    toast.dismiss(id);
  };

  return (
    <NotificationContext.Provider value={{ notify, updateNotification, dismissNotification }}>
      {children}
      <ToastContainer />
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext); 