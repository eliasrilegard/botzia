use serenity::all::CommandInteraction;
use serenity::async_trait;
use serenity::builder::CreateCommand;
use serenity::client::Context;

use crate::commands::{probability, SlashCommand};
use crate::database::Database;
use crate::interaction::InteractionCustomGet;
use crate::Result;

#[derive(Default)]
pub struct Probability;

#[async_trait]
impl SlashCommand for Probability {
  fn register(&self) -> CreateCommand {
    let subcommands = probability::commands()
      .iter()
      .map(|(_, subcommand)| subcommand.register())
      .collect::<Vec<_>>();
    CreateCommand::new("probability")
      .description("Probability commands")
      .set_options(subcommands)
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, db: &Database) -> Result<()> {
    let subcommand_name = interaction.get_subcommand().unwrap().name;

    let subcommands = probability::commands();
    let (_, subcommand) = subcommands.iter().find(|(name, _)| name == &subcommand_name).unwrap();
    subcommand.execute(ctx, interaction, db).await?;

    Ok(())
  }
}
