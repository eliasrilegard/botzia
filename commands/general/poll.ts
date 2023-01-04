import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, GuildMember, GuildTextBasedChannel, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import UtilityFunctions from '../../utils/utilities';

export default class Poll extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('poll')
      .setDescription('Make a poll about something!')
      .addStringOption(option => option
        .setName('title')
        .setDescription('The title or question of the poll')
        .setRequired(true)
      )
      .addStringOption(option => option
        .setName('options')
        .setDescription('The options to vote on, separated by ;')
        .setRequired(true)
      )
      .addChannelOption(option => option
        .setName('channel')
        .setDescription('The channel to post the poll in')
        .addChannelTypes(ChannelType.GuildText)
      )
      .setDMPermission(false);

    super(data, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const question = interaction.options.getString('title');
    const options = interaction.options.getString('options')!.split(';').map(str => str.trim());
    const channel = interaction.options.getChannel('channel') as GuildTextBasedChannel ?? interaction.channel;

    if (interaction.guild) {
      if (!channel.permissionsFor(interaction.guild.members.me!).has('SendMessages')) {
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('Insufficient permissions')
          .setDescription(`I cannot send messages in ${channel}.`);
        interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    if (options.length > 20 || options.length < 2) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Check arguments')
        .setDescription('A poll needs at least 2 and at most 20 options.');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const allEmotes = ['🍎', '🍓', '🍐', '🍒', '🍇', '🥕', '🍊', '🍉', '🍈', '🍋', '🍌', '🥥', '🥑', '🥦', '🌶️', '🌽', '🥝', '🧄', '🍍', '🥬'];
    if (Math.random() < 0.05) allEmotes.push('<:kekw:743962015411732510>');
    const emotes = UtilityFunctions.shuffle(allEmotes).slice(0, options.length);

    let choicesString = '';
    options.forEach((option, index) => choicesString += `${emotes[index]} - ${option}\n`);

    const response = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Success')
      .setDescription(`Posting the poll in ${channel}.`);
    interaction.reply({ embeds: [response], ephemeral: true });

    const guildMember = interaction.member as GuildMember;
    const embed = new EmbedBuilder()
      .setColor(guildMember.displayHexColor)
      .setAuthor({ name: `${guildMember.displayName} created a poll`, iconURL: guildMember.displayAvatarURL() })
      .setTitle(question)
      .addFields({ name: 'Choices', value: choicesString.trim() })
      .setFooter({ text: 'React with your vote below!' })
      .setTimestamp();
    
    const pollMessage = await channel.send({ embeds: [embed] });
    emotes.forEach(emote => pollMessage.react(emote));
  }
}