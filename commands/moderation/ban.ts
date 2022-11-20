import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import UtilityFunctions from '../../utils/utilities';

export default class Ban extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a member')
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(option => option
        .setName('member')
        .setDescription('The member to ban')
        .setRequired(true)
      )
      .addStringOption(option => option
        .setName('reason')
        .setDescription('The reason for banning')
      )
      .addStringOption(option => option
        .setName('notification')
        .setDescription('A notification message to be sent to the user')
      );
    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.options.getUser('member')!;
    const reason = interaction.options.getString('reason');
    const notifMsg = interaction.options.getString('notification');

    const embed = new EmbedBuilder().setColor(this.client.config.colors.RED);

    if (member.id === this.client.user!.id) {
      embed.setTitle('I can\'t ban myself');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const guildMember = await interaction.guild!.members.fetch(member.id);
    if (
      UtilityFunctions.permHierarchy(guildMember, interaction.member as GuildMember) &&
      guildMember.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      embed
        .setTitle('Can\'t ban member')
        .setDescription('You cannot ban someone equal to or above you.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    const meAsGuildMember = await interaction.guild!.members.fetchMe();
    if (UtilityFunctions.permHierarchy(guildMember, meAsGuildMember)) {
      embed
        .setTitle('Can\'t ban member')
        .setDescription('Specified user is above my highest role.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (!guildMember.bannable) { // Failsafe
      embed
        .setTitle('Can\'t ban member')
        .setDescription(`<@${member.id}> cannot be banned.`);
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (notifMsg) {
      embed
        .setAuthor({
          name: `You have been banned from ${interaction.guild!.name}`,
          iconURL: interaction.guild!.iconURL() ?? undefined
        })
        .addFields({
          name: 'Message',
          value: notifMsg
        });
      await this.client.users.send(member, { embeds: [embed] });
    }

    interaction.guild!.members.ban(member, { reason: reason ?? undefined });

    const successEmbed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setAuthor({
        name: `${member.tag} banned`,
        iconURL: member.displayAvatarURL() ?? undefined
      })
      .setTimestamp();
    if (reason) successEmbed.addFields({ name: 'Reason', value: reason });

    await interaction.channel!.send({ embeds: [successEmbed] });

    const responseEmbed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Ban successful');
    interaction.reply({ embeds: [responseEmbed], ephemeral: true });
  }
}