import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

class Remindme extends Command {
  public constructor() {
    super(
      'remindme',
      'Remind you of a message after a given time!',
      ['[time until reminder]', '[time until reminder]; (message)']
    );
  }

  public async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {
    const indexMessageStart = args.indexOf(args.filter(arg => arg.includes(';'))[0]) + 1; // -1 + 1 if no match
    const reminderMessage = indexMessageStart ? args.slice(indexMessageStart, args.length).join(' ') : '';
    const timeArgs = indexMessageStart ? [...args.slice(0, indexMessageStart - 1), args[indexMessageStart - 1].slice(0, -1)] : args;

    const timeData = [0, 0, 0]; // Days, Hours, Minutes
    const acceptedWords = ['day', 'hour', 'min'];

    timeArgs.forEach((arg, i) => {
      if (arg.match(/^\d+[dhm]$/i)) {
        const index = Number(arg.slice(-1).toLowerCase() === 'h') + Number(arg.slice(-1).toLowerCase() === 'm') * 2;
        timeData[index] = Math.abs(parseInt(arg.slice(0, -1)));
      }
      else if (acceptedWords.some(word => arg.toLowerCase().startsWith(word)) && args[i - 1].match(/^\d+$/)) {
        const index = Number(arg.slice(0, 1).toLowerCase() === 'h') + Number(arg.slice(0, 1).toLowerCase() === 'm') * 2;
        timeData[index] = Math.abs(parseInt(timeArgs[i - 1]));
      }
    });
    
    const time = (timeData[0] * 24 * 60 + timeData[1] * 60 + timeData[2]) * 60000;
    if (time <= 0) {
      message.channel.send({ embeds: [this.helpMessage(client, await client.prefix(message))] });
      return;
    }
    if (time > 2073600000) { // Limit of setTimeout
      message.channel.send({ embeds: [this.tooLong(client)] });
      return;
    }
    
    const UIWords = ['days', 'hours', 'minutes'];
    const UIArray: Array<string> = [];
    timeData.forEach((data, i) => {
      if (data) UIArray.push(`${data} ${data === 1 ? UIWords[i].slice(0, -1) : UIWords[i]}`);
    });
    const UIString = UIArray.join(', ').replace(/,(?=[^,]*$)/, ' and'); // Replace last ', ' with ' and '
    
    const embed = new MessageEmbed()
      .setColor(client.config.colors.GREEN)
      .setTitle('Reminder created')
      .setDescription(`Okay! I will remind you in ${UIString}.`)
      .setTimestamp();
    if (reminderMessage) embed.addField('Message:', reminderMessage);
    message.channel.send({ embeds: [embed] });
    delete embed.fields;

    embed
      .setColor(client.config.colors.BLUE)
      .setTitle(`${reminderMessage ? 'Here\'s your reminder!' : 'Ding!'}`)
      .setDescription(`${reminderMessage ? reminderMessage : 'Here\'s your reminder!'}`);
    
    const pingList: Array<string> = [];
    if (message.mentions.members.size && reminderMessage) message.mentions.members.forEach(member => pingList.push(`${member}`));

    const sendPingMessage = pingList.length > 0 ?
      () => message.reply({ content: pingList.join(', '), embeds: [embed] }) :
      () => message.reply({ embeds: [embed] });
    setTimeout(sendPingMessage, time);
  }

  private helpMessage(client: Bot, prefix: string): MessageEmbed {
    return new MessageEmbed()
      .setColor(client.config.colors.RED)
      .setTitle('Invalid time')
      .setDescription('Maybe check your arguments?')
      .addField('Arguments', '**Days:\nHours:\nMinutes:**', true)
      .addField('\u200b', 'd, day(s)\nh, hour(s)\nm, min(s), minute(s)', true)
      .addField('Command usage', this.howTo(prefix, true));
  }

  private tooLong(client: Bot): MessageEmbed {
    return new MessageEmbed()
      .setColor(client.config.colors.RED)
      .setTitle('Invalid time')
      .setDescription('Reminders have an upper time limit of 24 days.');
  }
}

export default Remindme;