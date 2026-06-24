export interface IEventPublisher {
  publish(routingKey: string, payload: object): Promise<void>;
}
