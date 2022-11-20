import { EmbedBuilder, Message } from 'discord.js';
import Bot from '../../bot/bot';
import TextCommand from '../../bot/textcommand';
import UtilityFunctions from '../../utils/utilities';

export default class Poll extends TextCommand {
  constructor(client: Bot) {
    super(
      client,
      'poll',
      'Make a poll about something!',
      ['[question]; [option 1]; [option 2] ...'],
      { guildOnly: true }
    );
  }

  async execute(message: Message, args: Array<string>): Promise<void> {
    const pollOptions = args.join(' ').split(';').map(str => str.trim());
    const question = pollOptions.shift();

    if (pollOptions.length > 20 || pollOptions.length < 2) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Check arguments')
        .setDescription('A poll needs at least 2 and a most 20 options.')
        .addFields({ name: 'Command usage:', value: this.howTo(await this.client.prefix(message), true) });
      message.channel.send({ embeds: [embed] });
      return;
    }

    const allEmotes = ['🍎', '🍓', '🍐', '🍒', '🍇', '🥕', '🍊', '🍉', '🍋', '🍌', '🥥', '🥑', '🥦', '🌶️', '🌽', '🥝', '🧄', '🍍', '🥬', '<:kekw:743962015411732510>'];

    const emotes = (UtilityFunctions.shuffle(allEmotes) as Array<string>).slice(0, pollOptions.length);

    let choicesString = '';
    pollOptions.forEach((option, index) => choicesString += `${emotes[index]} - ${option}\n`);

    const embed = new EmbedBuilder()
      .setColor(message.member?.displayHexColor ?? this.client.config.colors.BLUE)
      .setAuthor({ name: `${message.member!.displayName} created a poll`, iconURL: message.member!.displayAvatarURL() })
      .setTitle(question!)
      .addFields({ name: 'Choices', value: choicesString.trim() })
      .setFooter({ text: 'React with your vote below!' })
      .setTimestamp();
    
    const pollMessage = await message.channel.send({ embeds: [embed] });
    emotes.forEach(emote => pollMessage.react(emote));
  }
}