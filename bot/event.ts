import Bot from './bot';

export default class ClientEvent {
  /**
   * @param name The name of the event
   * @param isOnce If the event is `.once` (set `true`) or `.on` (set `false`)
   */
  // eslint-disable-next-line no-empty-function
  protected constructor(readonly name: string, readonly isOnce: boolean) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute(client: Bot, ...args: unknown[]): void {
    throw new Error('Method not implemented.');
  }
}