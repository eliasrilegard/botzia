import { Message, MessageEmbed, StageChannel, VoiceChannel } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';

type VC = VoiceChannel | StageChannel;

export default class MassMove extends Command {
  constructor(client: Bot) {
    super(
      client,
      'massmove',
      'Moves all users in one voice channel to another',
      ['(base channel) [target channel]'],
      { aliases: ['mmove'], guildOnly: true, permissions: 'MOVE_MEMBERS' }
    );
  }

  async execute(message: Message, args: Array<string>) {
    // If user is in voice, assume base channel is the one they're in, should they only specify one channel

    // Filter out all voice channels from the guild
    const allChannels = await message.guild.channels.fetch();
    const channels: Array<VC> = [];
    for (const channel of allChannels.values()) {
      if (channel.isVoice()) channels.push(channel);
    }

    // Find the relevant voice channels the user has specified
    const relevantChannels = this.findRelevant(args, channels);

    switch (relevantChannels.length) {
      case 0: { // No channels found
        const embed = new MessageEmbed()
          .setColor(this.client.config.colors.RED)
          .setTitle('Can\'t identify channel')
          .setDescription('Remember that names are Case Sensitive!');
        message.channel.send({ embeds: [embed] });
        break;
      }
      case 1: { // Matches one exactly
        const baseChannel = await this.getUserVoiceChannel(message);
        if (!baseChannel) {
          const embed = new MessageEmbed()
            .setColor(this.client.config.colors.RED)
            .setTitle('Unknown base channel')
            .setDescription('Unless you\'re in a voice channel you need to specify both the base and target channels.');
          message.channel.send({ embeds: [embed] });
          break;
        }
        if (baseChannel.equals(relevantChannels[0])) {
          const embed = new MessageEmbed()
            .setColor(this.client.config.colors.RED)
            .setTitle('Nothing to move')
            .setDescription('You\'re already in this channel.');
          message.channel.send({ embeds: [embed] });
          return;
        }
        this.moveAllMembers(baseChannel, relevantChannels[0], message);
        const embed = new MessageEmbed()
          .setColor(this.client.config.colors.GREEN)
          .setTitle('Success')
          .setDescription(`Successfully moved everybody to ${relevantChannels[0].name}.`);
        message.channel.send({ embeds: [embed] });
        break;
      }
      case 2: { // Source and target channels specified
        if (relevantChannels[0].equals(relevantChannels[1])) {
          const embed = new MessageEmbed()
            .setColor(this.client.config.colors.RED)
            .setTitle('Nothing to move')
            .setDescription('I can\'t move members from and to the same channel.');
          message.channel.send({ embeds: [embed] });
          return;
        }
        if (relevantChannels[0].members.size === 0) {
          const embed = new MessageEmbed()
            .setColor(this.client.config.colors.RED)
            .setTitle('Nobody to move')
            .setDescription('There is nobody in the channel to move from.');
          message.channel.send({ embeds: [embed] });
          return;
        }
        this.moveAllMembers(relevantChannels[0], relevantChannels[1], message);
        const embed = new MessageEmbed()
          .setColor(this.client.config.colors.GREEN)
          .setTitle('Success')
          .setDescription(`Successfully moved everybody from ${relevantChannels[0].name} to ${relevantChannels[1].name}.`);
        message.channel.send({ embeds: [embed] });
        break;
      }
      default: {
        const embed = new MessageEmbed()
          .setColor(this.client.config.colors.RED)
          .setTitle('Error')
          .setDescription('An unknown error occurred :(');
        message.channel.send({ embeds: [embed] });
      }
    }
  }

  private moveAllMembers(base: VC, goal: VC, message: Message): void {
    base.members.forEach(member => member.voice.setChannel(goal, `Mass move command issued by ${message.member.displayName}`));
  }

  private async getUserVoiceChannel(message: Message): Promise<VC> {    
    const channel = await message.member.voice.channel.fetch();
    return channel ? channel : undefined;
  }

  private findRelevant(args: Array<string>, vcs: Array<VC>): Array<VC> {
    const vcFilter = (name: string) => vcs.filter(vc => vc.name === name);

    const searchForOne = vcFilter(args.join(' '));
    if (searchForOne.length === 1) return searchForOne;

    let i: number;
    for (i = 1; i < args.length; i++) {
      const searchBase = vcFilter(args.slice(0, i).join(' '));
      const searchDest = vcFilter(args.slice(i).join(' '));
      if (searchBase.length === 1 && searchDest.length === 1) break;
    }

    const foundBase = vcFilter(args.slice(0, i).join(' '));
    const foundGoal = vcFilter(args.slice(i).join(' '));
    if (foundBase.length === 0) return [];
    return foundBase.concat(foundGoal);
  }
}