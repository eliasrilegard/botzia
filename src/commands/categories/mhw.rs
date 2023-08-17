use serenity::async_trait;
use serenity::builder::CreateApplicationCommand;
use serenity::model::application::interaction::autocomplete::AutocompleteInteraction;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::commands::{mhw, SlashCommand};
use crate::database::Database;
use crate::interaction::{AutocompleteCustomGet, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct Mhw;


#[async_trait]
impl SlashCommand for Mhw {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand {
    let subcommands = mhw::commands();
    for (_, subcommand) in subcommands {
      command.create_option(|option| subcommand.register(option));
    }

    command.name("mhw").description("Monster Hunter World: Iceborne")
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()> {
    let subcommands = mhw::commands();

    let subcommand_name = interaction.get_subcommand().unwrap().name;

    let (_, subcommand) = subcommands.iter().find(|pair| pair.0 == subcommand_name).unwrap();
    subcommand.execute(ctx, interaction, db).await?;

    Ok(())
  }

  async fn autocomplete(&self, ctx: &Context, interaction: &AutocompleteInteraction, db: &Database) -> Result<()> {
    let subcommands = mhw::commands();

    let subcommand_name = interaction.get_subcommand().unwrap().name;

    let (_, subcommand) = subcommands.iter().find(|pair| pair.0 == subcommand_name).unwrap();
    subcommand.autocomplete(ctx, interaction, db).await?;

    Ok(())
  }
}
