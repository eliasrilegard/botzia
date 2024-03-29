import { EmbedBuilder, Events, Message } from 'discord.js';
import Bot from '../bot/bot';
import ClientEvent from '../bot/event';

export default class MessageCreate extends ClientEvent {
  constructor() {
    super(Events.MessageCreate, false);
  }

  async execute(client: Bot, message: Message): Promise<void> {
    // Ignore bots
    if (message.author.bot) return;

    const prefix = await client.prefix(message);

    if (message.content.startsWith(`<@!${client.user!.id}>`)) {
      const embed = new EmbedBuilder()
        .setColor(client.config.colors.GREEN)
        .setTitle('Getting started')
        .setDescription(`Use \`${prefix}help\` to get started!`);
      message.reply({ embeds: [embed] });
      return;
    }

    if (!(message.content.startsWith(prefix))) return; // Ignore non-commands

    const args = message.content.slice(prefix.length).trim().split(/ +/); // Split every word of message into list
    const commandName = args.shift()!.toLowerCase(); // Extract command name and finalize args list

    const command = client.textCommands.get(commandName) || // Search for command name
      client.textCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName)); // Or look for potential aliases
    if (!command) return;

    if (!(await command.preRunCheck(message, args))) return;

    try {
      await command.execute(message, args);
      const embed = new EmbedBuilder()
        .setColor(client.config.colors.RED)
        .setFooter({ text: 'Warning: Text commands are deprecated\nand will be removed in the next update.\nConsider using slash commands instead.' });
      message.channel.send({ embeds: [embed] });
    }
    catch (error) {
      console.log(`The following error was caused by ${message.author.tag}:`);
      console.log(error);
    }
  }
}