
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('SW registrado com sucesso: ', registration.scope);

          // Solicitar permissão de notificações
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then((permission) => {
              console.log('🔔 Permissão de notificação:', permission);
            });
          }
        })
        .catch((err) => {
          console.log('Falha ao registrar SW: ', err);
        });
    });
  }
}
