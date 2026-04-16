self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Przypomnienie", {
      body: data.body ?? "",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: data.eventId ?? "calendar-reminder",
      data: { url: "/kalendarz" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/kalendarz") && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow("/kalendarz");
      })
  );
});
