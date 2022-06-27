import Bot from './bot';

export default class ClientEvent {
  readonly name: string;
  readonly once: boolean;

  protected constructor(name: string, once: boolean) {
    this.name = name;
    this.once = once;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute(client: Bot, ...args): void {
    throw new Error('Method not implemented.');
  }
}