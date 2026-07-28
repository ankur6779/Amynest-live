import type {
  NotificationChannel,
  NotificationDelivery,
  NotificationEventKind,
  NotificationPayload,
} from "../../types/published-video.js";

export interface NotificationTransport {
  readonly channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<NotificationDelivery>;
}

export class InMemoryNotificationBus {
  private readonly transports = new Map<NotificationChannel, NotificationTransport>();
  private readonly sent: NotificationPayload[] = [];

  constructor(transports: NotificationTransport[] = createDefaultTransports()) {
    for (const transport of transports) {
      this.transports.set(transport.channel, transport);
    }
  }

  async notify(
    channels: readonly NotificationChannel[],
    event: NotificationEventKind,
    details: {
      title: string;
      body: string;
      videoId?: string;
      url?: string;
      metadata?: Record<string, string | number | boolean>;
    },
  ): Promise<NotificationDelivery[]> {
    const deliveries: NotificationDelivery[] = [];
    for (const channel of channels) {
      const transport = this.transports.get(channel);
      if (!transport) {
        deliveries.push({
          channel,
          event,
          delivered: false,
          at: new Date().toISOString(),
          detail: "transport not configured",
        });
        continue;
      }
      const payload: NotificationPayload = {
        channel,
        event,
        title: details.title,
        body: details.body,
        videoId: details.videoId,
        url: details.url,
        at: new Date().toISOString(),
        metadata: details.metadata,
      };
      this.sent.push(payload);
      deliveries.push(await transport.send(payload));
    }
    return deliveries;
  }

  listSent(): NotificationPayload[] {
    return this.sent.map((p) => ({ ...p, metadata: p.metadata ? { ...p.metadata } : undefined }));
  }

  clear(): void {
    this.sent.length = 0;
  }
}

export function createDefaultTransports(): NotificationTransport[] {
  return [
    memoryTransport("telegram"),
    memoryTransport("email"),
    memoryTransport("webhook"),
    memoryTransport("slack"),
    memoryTransport("discord"),
  ];
}

function memoryTransport(channel: NotificationChannel): NotificationTransport {
  return {
    channel,
    async send(payload) {
      return {
        channel,
        event: payload.event,
        delivered: true,
        at: new Date().toISOString(),
        detail: `${channel}: ${payload.title}`,
      };
    },
  };
}
