import React, { createContext, useContext, useState, useCallback } from 'react';
import PandaDialog from '../components/PandaDialog';

const DialogContext = createContext();

export const useDialog = () => {
  return useContext(DialogContext);
};

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    resolve: null
  });

  const confirm = useCallback((message, title = 'Confirmación', options = {}) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        confirmText: options.confirmText || 'Sí, continuar',
        cancelText: options.cancelText || 'Cancelar',
        danger: !!options.danger,
        resolve
      });
    });
  }, []);

  const alert = useCallback((message, title = 'Aviso') => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        type: 'alert',
        confirmText: 'Entendido',
        cancelText: '',
        resolve
      });
    });
  }, []);

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) dialogState.resolve(false);
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) dialogState.resolve(true);
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <PandaDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        danger={dialogState.danger}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  );
};
