import type {
  OpsNotificationChannel,
  OpsNotificationDelivery,
  OpsNotificationEvent,
  OpsNotificationPayload,
} from "../../types/operations.js";

export interface OpsNotificationTransport {
  channel: OpsNotificationChannel;
  deliver(payload: OpsNotificationPayload): Promise<OpsNotificationDelivery>;
}

export interface OpsNotificationBusOptions {
  channels: OpsNotificationChannel[];
  transports?: OpsNotificationTransport[];
  enabled?: boolean;
}

/** Operations notification bus for startup/shutdown/failure/recovery/summaries. */
export class OpsNotificationBus {
  private readonly channels: Set<OpsNotificationChannel>;
  private readonly transports: Map<OpsNotificationChannel, OpsNotificationTransport>;
  private readonly enabled: boolean;
  private readonly history: OpsNotificationDelivery[] = [];

  constructor(options: OpsNotificationBusOptions) {
    this.channels = new Set(options.channels);
    this.enabled = options.enabled !== false;
    this.transports = new Map();
    for (const transport of options.transports ?? createDefaultOpsTransports()) {
      this.transports.set(transport.channel, transport);
    }
  }

  list(): OpsNotificationDelivery[] {
    return this.history.map((h) => ({ ...h }));
  }

  async notify(
    event: OpsNotificationEvent,
    title: string,
    body: string,
    correlationId: string,
    metadata?: Record<string, string | number | boolean>,
  ): Promise<OpsNotificationDelivery[]> {
    if (!this.enabled) return [];
    const deliveries: OpsNotificationDelivery[] = [];
    for (const channel of this.channels) {
      const transport = this.transports.get(channel);
      if (!transport) continue;
      const payload: OpsNotificationPayload = {
        event,
        channel,
        title,
        body,
        correlationId,
        createdAt: new Date().toISOString(),
        metadata,
      };
      const delivery = await transport.deliver(payload);
      this.history.push(delivery);
      deliveries.push(delivery);
    }
    return deliveries;
  }
}

export function createDefaultOpsTransports(): OpsNotificationTransport[] {
  const channels: OpsNotificationChannel[] = [
    "telegram",
    "email",
    "slack",
    "discord",
    "webhook",
  ];
  return channels.map((channel) => ({
    channel,
    async deliver(payload): Promise<OpsNotificationDelivery> {
      return {
        event: payload.event,
        channel,
        delivered: true,
        deliveredAt: new Date().toISOString(),
        message: `Delivered ${payload.event} via ${channel}`,
      };
    },
  }));
}
