import type { IEventPublisher } from "../../../domain/ports/outbound/event-publisher.port.js";

interface PublishedEvent {
  routingKey: string;
  payload: object;
  publishedAt: Date;
}

export class InMemoryEventPublisher implements IEventPublisher {
  #events: PublishedEvent[] = [];

  async publish(routingKey: string, payload: object): Promise<void> {
    this.#events.push({ routingKey, payload, publishedAt: new Date() });
  }

  get events(): PublishedEvent[] {
    return [...this.#events];
  }

  getByRoutingKey(routingKey: string): PublishedEvent[] {
    return this.#events.filter((event) => event.routingKey === routingKey);
  }

  clear(): void {
    this.#events = [];
  }
}
