const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class RemindMe extends Command {
  constructor() {
    super('remindme', 'Remind you of a message after a given time!', '[time until reminder]; [optional message]');
  }

  async execute(message, args, client) {
    const indexMessageStart = args.indexOf(args.filter(arg => arg.includes(';'))[0]) + 1; // -1 + 1 if no match
    const reminderMessage = indexMessageStart ? args.slice(indexMessageStart, args.length).join(' ') : '';
    const timeArgs = indexMessageStart ? [...args.slice(0, indexMessageStart - 1), args[indexMessageStart - 1].slice(0, -1)] : args;

    const timeData = [0, 0, 0]; // Days, Hours, Minutes
    const acceptedWords = ['day', 'hour', 'min'];

    timeArgs.forEach((arg, i) => {
      if (arg.match(/^\d+[dhm]$/i)) {
        const index = arg.slice(-1).toLowerCase() == 'h' | (arg.slice(-1).toLowerCase() == 'm') * 2; // If it looks stupid but it works, it ain't stupid
        timeData[index] = Math.abs(parseInt(arg.slice(0, -1)));
      }
      else if (acceptedWords.some(word => arg.toLowerCase().startsWith(word)) && args[i - 1].match(/^\d+$/)) {
        const index = arg.slice(0, 1).toLowerCase() == 'h' | (arg.slice(0, 1).toLowerCase() == 'm') * 2;
        timeData[index] = Math.abs(parseInt(timeArgs[i - 1]));
      }
    });
    
    const time = (timeData[0] * 24 * 60 + timeData[1] * 60 + timeData[2]) * 60000;
    if (!time > 0) return message.channel.send({ embeds: [this.helpMessage(await client.prefix(message))] });
    if (time > 2073600000) return message.channel.send({ embeds: [this.tooLong()] });
    
    const UIWords = ['days', 'hours', 'minutes'];
    const UIArray = new Array();
    timeData.forEach((data, i) => {
      if (data) UIArray.push(`${data} ${data == 1 ? UIWords[i].slice(0, -1) : UIWords[i]}`);
    });
    const UIString = UIArray.join(', ').replace(/,([^,]*)$/, ' and$1'); // Replace last ', ' with ' and '
    
    const embed = new MessageEmbed()
      .setColor('00cc00')
      .setTitle('Reminder created')
      .setDescription(`Okay! I will remind you in ${UIString}.`)
      .setTimestamp();
    if (reminderMessage) embed.addField('Message:', reminderMessage);
    message.channel.send({ embeds: [embed] });
    delete embed.fields;

    embed
      .setColor('0066cc')
      .setTitle(`${reminderMessage ? 'Here\'s your reminder!' : 'Ding!'}`)
      .setDescription(`${reminderMessage ? reminderMessage : 'Here\'s your reminder!'}`);
    
    setTimeout(() => message.reply({ embeds: [embed] }), time);
  }
  
  helpMessage(prefix) {
    return new MessageEmbed()
      .setColor('cc0000')
      .setTitle('Invalid time')
      .setDescription('Maybe check your arguments?')
      .addField('Arguments', '**Days:\nHours:\nMinutes:**', true)
      .addField('\u200b', 'd, day(s)\nh, hour(s)\nm, min(s), minute(s)', true)
      .addField('Command usage', this.howTo(prefix, true));
  }

  tooLong() {
    return new MessageEmbed()
      .setColor('cc0000')
      .setTitle('Invalid time')
      .setDescription('Reminders have an upper time limit of 24 days.');
  }
}

module.exports = RemindMe;