import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from './bot';

interface SlashCommandOptions {
  belongsTo?: string;
  isCategory?: boolean;
}

const defaultOptions: SlashCommandOptions = {
  belongsTo: undefined,
  isCategory: false
};

export default class SlashCommand {
  readonly belongsTo: string;
  readonly isCategory: boolean;

  protected constructor(
    readonly data: SlashCommandBuilder | SlashCommandSubcommandBuilder,
    readonly client?: Bot,
    customOptions?: SlashCommandOptions
  ) {
    const commandOptions: SlashCommandOptions = { ...defaultOptions, ...customOptions };
    this.belongsTo = commandOptions.belongsTo;
    this.isCategory = commandOptions.isCategory;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subCommands = this.client.slashCommands.filter(cmd => cmd.belongsTo === this.data.name);

    const subCommandName = interaction.options.getSubcommand();

    const subCommand = subCommands.get(subCommandName);
    subCommand.execute(interaction);
  }
}