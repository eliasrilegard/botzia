const Command = require('../../bot/command.js');

class Beep extends Command {
  constructor() {
    super('beep', 'boop!', '<usage>', { args: false });
  }

  async execute(message) {
    message.channel.send('boop!');
  }
}

module.exports = Beep;