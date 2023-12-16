use serenity::all::CommandInteraction;
use serenity::async_trait;
use serenity::builder::CreateCommand;
use serenity::client::Context;

use crate::commands::{dd, SlashCommand};
use crate::database::Database;
use crate::interaction::InteractionCustomGet;
use crate::Result;

#[derive(Default)]
pub struct DD;

#[async_trait]
impl SlashCommand for DD {
  fn register(&self) -> CreateCommand {
    let options = dd::commands()
      .iter()
      .map(|(_, subcommand)| subcommand.register())
      .collect::<Vec<_>>();
    CreateCommand::new("dd")
      .description("Dungeon Defenders")
      .set_options(options)
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, db: &Database) -> Result<()> {
    let subcommand_name = interaction.get_subcommand().unwrap().name;

    let subcommands = dd::commands();
    let (_, subcommand) = subcommands.iter().find(|(name, _)| name == &subcommand_name).unwrap();
    subcommand.execute(ctx, interaction, db).await?;

    Ok(())
  }

  async fn autocomplete(&self, ctx: &Context, interaction: &CommandInteraction, db: &Database) -> Result<()> {
    let subcommand_name = interaction.get_subcommand().unwrap().name;

    let subcommands = dd::commands();
    let (_, subcommand) = subcommands.iter().find(|(name, _)| name == &subcommand_name).unwrap();
    subcommand.autocomplete(ctx, interaction, db).await?;

    Ok(())
  }
}
