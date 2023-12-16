use serenity::all::CommandInteraction;
use serenity::async_trait;
use serenity::builder::{CreateCommand, CreateCommandOption};
use serenity::client::Context;

use crate::database::Database;
use crate::handler::{CommandCollection, Handler};
use crate::Result;

mod category;
mod dd;
mod general;
mod mhw;
mod moderation;
mod probability;
mod time;

type NamedCommands = Vec<(&'static str, Box<dyn SlashCommand + Send + Sync>)>;
type NamedSubCommands = Vec<(&'static str, Box<dyn SlashSubCommand + Send + Sync>)>;

#[async_trait]
pub trait SlashCommand {
  fn register(&self) -> CreateCommand;

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, db: &Database) -> Result<()>;

  // Needs to be implemented for any category command that has any subcommand with autocomplete enabled
  async fn autocomplete(&self, _ctx: &Context, _interaction: &CommandInteraction, _db: &Database) -> Result<()> {
    Err("This command doesn't have any parameters with autocomplete enabled.".into())
  }
}

#[async_trait]
pub trait SlashSubCommand {
  fn register(&self) -> CreateCommandOption;

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, db: &Database) -> Result<()>;

  async fn autocomplete(&self, _ctx: &Context, _interaction: &CommandInteraction, _db: &Database) -> Result<()> {
    Err("This command doesn't have any parameters with autocomplete enabled.".into())
  }
}

impl Handler {
  pub fn build_commands() -> CommandCollection {
    category::commands()
      .into_iter()
      .chain(general::commands())
      .chain(moderation::commands())
      .collect()
  }
}
