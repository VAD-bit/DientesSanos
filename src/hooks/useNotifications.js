import { useState, useCallback } from 'react';

export const useNotifications = () => {
  const [toasts, setToasts] = useState([]);

  // --- UI TOASTS (Alertas Visuales) ---
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    // Auto-remove after 4 seconds, playing the exit animation first
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 250);
    }, 4000);
  }, []);

  // --- BROWSER PUSH NOTIFICATIONS ---
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Tu navegador no soporta notificaciones.', 'error');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('¡Notificaciones activadas con éxito!', 'success');
      return true;
    } else {
      showToast('Permiso de notificaciones denegado.', 'error');
      return false;
    }
  };

  const sendPushNotification = useCallback((title, body) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico', // Default icon
        badge: '/favicon.ico',
        tag: 'panda-alert',
        renotify: true
      });
    }
  }, []);

  const triggerConfetti = useCallback(() => {
    const colors = ['#ffffff', '#f9d976', '#ffffff', '#c0c0c0'];
    const count = 40;
    
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.width = Math.random() * 10 + 5 + 'px';
      p.style.height = Math.random() * 10 + 5 + 'px';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = Math.random() * 3 + 2 + 's';
      p.style.opacity = Math.random();
      document.body.appendChild(p);
      
      // Cleanup
      setTimeout(() => p.remove(), 5000);
    }
  }, []);

  const triggerRocket = useCallback(() => {
    // 1. Create Floating Panda Launcher
    const container = document.createElement('div');
    container.className = 'rocket-container';
    container.innerHTML = `
      <div class="rocket-body" style="font-size: 56px; filter: drop-shadow(0 0 20px rgba(197, 168, 128, 0.9));">
        🐼
        <div class="rocket-trail" style="background: linear-gradient(to bottom, var(--gold-primary), transparent); box-shadow: 0 0 20px var(--gold-primary);"></div>
      </div>
    `;
    document.body.appendChild(container);

    // 2. Spawn Gold Sparkle Particles
    const spawnSmoke = () => {
      for(let i=0; i<16; i++) {
        setTimeout(() => {
          const s = document.createElement('div');
          s.className = 'rocket-smoke';
          s.style.left = (50 + (Math.random() * 12 - 6)) + '%';
          s.style.backgroundColor = i % 2 === 0 ? 'var(--gold-primary)' : 'var(--color-purple-primary)';
          document.body.appendChild(s);
          setTimeout(() => s.remove(), 1500);
        }, i * 45);
      }
    };
    
    spawnSmoke();

    // 3. Cleanup
    setTimeout(() => container.remove(), 3000);
  }, []);

  return {
    toasts,
    showToast,
    requestPushPermission,
    sendPushNotification,
    triggerConfetti,
    triggerRocket
  };
};
