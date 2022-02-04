class ClientEvent {
  name: string;
  once: boolean;

  protected constructor(name: string, once: boolean) {
    this.name = name;
    this.once = once;
  }
}

export default ClientEvent;
