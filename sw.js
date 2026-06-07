// Service Worker for Class Presence Manager Web Push Notifications

self.addEventListener('push', (event) => {
    if (!event.data) {
        console.log('Push event received with no payload.');
        return;
    }

    try {
        const payload = event.data.json();
        console.log('Received push notification payload:', payload);

        const options = {
            body: payload.body,
            icon: '/favicon.ico', // Fallback icon
            badge: '/favicon.ico', // Fallback badge
            data: {
                url: payload.url || '/'
            },
            vibrate: [200, 100, 200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: 'Abrir Painel'
                }
            ],
            tag: 'class-presence-alert', // Avoid duplicate identical notifications
            requireInteraction: true // Keep notification active until actioned
        };

        event.waitUntil(
            self.registration.showNotification(payload.title || 'Mundo Kids', options)
        );
    } catch (e) {
        console.error('Error handling push event:', e);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If a tab is already open, focus it and redirect
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.postMessage({ type: 'NAVIGATE', url: targetUrl });
                    return client.focus();
                }
            }
            // If no tab is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
