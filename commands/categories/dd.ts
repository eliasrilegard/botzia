import Command from '../../bot/command';

export default class DD extends Command {
  constructor() {
    super(
      'dd',
      'Dungeon Defenders',
      ['[command] [arguments]'],
      { category: true }
    );
  }
}