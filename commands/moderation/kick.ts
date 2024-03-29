import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';
import UtilityFunctions from '../../utils/utilities';

export default class Kick extends SlashCommand {
  constructor(client: Bot) {
    const data = new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a member')
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption(option => option
        .setName('member')
        .setDescription('The member to kick')
        .setRequired(true)
      )
      .addStringOption(option => option
        .setName('reason')
        .setDescription('The reason for kicking')
      )
      .addStringOption(option => option
        .setName('notification')
        .setDescription('A notification message to be sent to the user')
      );
    super(data as SlashCommandBuilder, client);
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.options.getMember('member')! as GuildMember;
    const reason = interaction.options.getString('reason');
    const notifMsg = interaction.options.getString('notification');

    const embed = new EmbedBuilder().setColor(this.client.config.colors.RED);
    
    if (!member) {
      embed
        .setTitle('Unknown member')
        .setDescription('That user doesn\'t seem to be in this server.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (member.id === this.client.user!.id) {
      embed.setTitle('I can\'t kick myself');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const guildMember = await interaction.guild!.members.fetch(member.id);
    if (
      guildMember.permissions.has(PermissionFlagsBits.KickMembers) ||
      guildMember.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      embed
        .setTitle('Can\'t kick moderators')
        .setDescription('Cannot kick moderators of the server.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (UtilityFunctions.permHierarchy(guildMember, interaction.member as GuildMember)) {
      embed
        .setTitle('Can\'t kick member')
        .setDescription('You cannot kick someone equal to or above you.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    const meAsGuildMember = await interaction.guild!.members.fetchMe();
    if (UtilityFunctions.permHierarchy(member, meAsGuildMember)) {
      embed
        .setTitle('Can\'t kick member')
        .setDescription('Specified user is above my highest role.');
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (!member.kickable) {
      embed
        .setTitle('Can\'t kick member')
        .setDescription(`<@${member.id}> cannot be kicked.`);
      interaction.reply({ embeds: [embed] });
      return;
    }

    if (notifMsg) {
      embed
        .setAuthor({
          name: `You have been kicked from ${interaction.guild!.name}`,
          iconURL: interaction.guild!.iconURL() ?? undefined
        })
        .addFields({
          name: 'Message',
          value: notifMsg
        });
      await this.client.users.send(member, { embeds: [embed] });
    }

    member.kick(`${reason ? `${reason} ` : ''}[Issued by ${interaction.user.tag}]`);

    const successEmbed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setAuthor({
        name: `${member.user.tag} kicked`,
        iconURL: member.displayAvatarURL() ?? undefined
      })
      .setTimestamp();
    if (reason) successEmbed.addFields({ name: 'Reason', value: reason });

    await interaction.channel!.send({ embeds: [successEmbed] });

    const responseEmbed = new EmbedBuilder()
      .setColor(this.client.config.colors.GREEN)
      .setTitle('Kick successful');
    interaction.reply({ embeds: [responseEmbed], ephemeral: true });
  }
}