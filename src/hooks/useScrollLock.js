import { useEffect } from 'react';

let globalOpenModalsCount = 0;
let savedScrollY = 0;

export const useScrollLock = (isOpen) => {
  useEffect(() => {
    let wasOpen = false;

    if (isOpen) {
      wasOpen = true;
      if (globalOpenModalsCount === 0) {
        savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${savedScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
      }
      globalOpenModalsCount++;
    }

    return () => {
      if (wasOpen) {
        globalOpenModalsCount--;
        if (globalOpenModalsCount <= 0) {
          globalOpenModalsCount = 0;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
          document.body.classList.remove('modal-open');
          window.scrollTo(0, 0);
        }
      }
    };
  }, [isOpen]);
};
