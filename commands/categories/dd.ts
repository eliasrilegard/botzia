import Command from '../../bot/command';

export default class DD extends Command {
  public constructor() {
    super(
      'dd',
      'Dungeon Defenders',
      ['[command] [arguments]'],
      { category: true }
    );
  }
}