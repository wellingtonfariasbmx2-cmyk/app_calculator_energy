
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('SW registrado com sucesso: ', registration.scope);
        })
        .catch((err) => {
          console.log('Falha ao registrar SW: ', err);
        });
    });
  }
}
