import Bot from './bot';

class ClientEvent {
  public readonly name: string;
  public readonly once: boolean;

  protected constructor(name: string, once: boolean) {
    this.name = name;
    this.once = once;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public execute(client: Bot, ...args): void {
    throw new Error('Method not implemented.');
  }
}

export default ClientEvent;
