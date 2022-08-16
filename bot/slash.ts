import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import Bot from './bot';

interface SlashCommandOptions {
  belongsTo?: string;
}

const defaultOptions: SlashCommandOptions = {
  belongsTo: undefined
};

export default class SlashCommand {
  readonly belongsTo?: string;

  protected constructor(
    readonly data: SlashCommandBuilder | SlashCommandSubcommandBuilder,
    readonly client?: Bot,
    customOptions?: SlashCommandOptions
  ) {
    const commandOptions: SlashCommandOptions = { ...defaultOptions, ...customOptions };
    this.belongsTo = commandOptions.belongsTo;
  }

  // eslint-disable-next-line no-empty-function, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {}
}