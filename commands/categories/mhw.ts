import Command from '../../bot/command';

class Mhw extends Command {
  constructor() {
    super('mhw', 'Monster Hunter World: Iceborne', '[command] [arguments]', { category: true });
  }
}

export default Mhw;