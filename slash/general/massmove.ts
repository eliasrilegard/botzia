import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits, SlashCommandBuilder, StageChannel, VoiceChannel } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

type VC = StageChannel | VoiceChannel;

export default class MassMove extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('massmove')
      .setDescription('Move all members to a specified channel')
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
      .addChannelOption(option => option
        .setName('target-channel')
        .setDescription('The channel to move everybody to')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(true)
      )
      .addChannelOption(option => option
        .setName('source-channel')
        .setDescription('The channel to move everybody from')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
      );
    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const destChannel = interaction.options.getChannel('target-channel') as VC;
    let baseChannel = interaction.options.getChannel('source-channel') as VC | null;

    const member = await interaction.guild!.members.fetch(interaction.user.id);

    if (!baseChannel) {
      baseChannel = member.voice.channel;
      if (!baseChannel) {
        const embed = new EmbedBuilder()
          .setColor(this.client.config.colors.RED)
          .setTitle('Unknown base channel')
          .setDescription('Unless you\'re in a voice channel you need to specify both the base and target channels.');
        interaction.reply({ embeds: [embed] });
        return;
      }
    }

    if (destChannel.equals(baseChannel)) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Nothing to move')
        .setDescription('I can\'t move members from and to the same channel.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (baseChannel.members.size === 0) {
      const embed = new EmbedBuilder()
        .setColor(this.client.config.colors.RED)
        .setTitle('Nobody to move')
        .setDescription('There is nobody in the channel to move from.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    this.moveAllMembers(baseChannel, destChannel, member);

    const embed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Success')
      .setDescription(`Successfully moved everybody to ${destChannel.name}.`);
    interaction.reply({ embeds: [embed] });
  }

  private moveAllMembers(base: VC, goal: VC, member: GuildMember): void {
    base.members.forEach(user => user.voice.setChannel(goal, `Mass move command issued by ${member.displayName}`));
  }
}