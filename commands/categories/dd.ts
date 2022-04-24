import Command from '../../bot/command';

class Dd extends Command {
  public constructor() {
    super(
      'dd',
      'Dungeon Defenders',
      ['[command] [arguments]'],
      { category: true }
    );
  }
}

export default Dd;