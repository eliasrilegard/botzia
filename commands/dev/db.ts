import { EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';

export default class Database extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'db',
      'Database management commands',
      ['[command]'],
      { devOnly: true }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    switch (args[0]) {
      case 'reload': {
        this.client.database.reloadAll();
        
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.GREEN)
          .setTitle('Database reloaded')
          .setDescription('Successfully reloaded all databases.');
        message.channel.send({ embeds: [embed] });
        return;
      }

      default: {
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('No such command')
          .setDescription(`The command \`${args[0]}\` couldn't be found.`);
        message.channel.send({ embeds: [embed] });
        return;
      }
    }
  }
}