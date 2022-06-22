import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Db extends Command {
  constructor() {
    super(
      'db',
      'Database management commands',
      ['[command]'],
      { devOnly: true }
    );
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    switch (args[0]) {
      case 'reload': {
        client.apiClient.serverPrefixes.loadDatabase();
        client.apiClient.userTimezones.loadDatabase();

        const embed = new MessageEmbed()
          .setColor(client.config.colors.GREEN)
          .setTitle('Database reloaded')
          .setDescription('Successfully reloaded all databases.');
        message.channel.send({ embeds: [embed] });
        return;
      }

      default: {
        const embed = new MessageEmbed()
          .setColor(client.config.colors.RED)
          .setTitle('No such command')
          .setDescription(`The command \`${args[0]}\` couldn't be found.`);
        message.channel.send({ embeds: [embed] });
        return;
      }
    }
  }
}

export default Db;