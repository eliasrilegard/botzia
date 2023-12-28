use std::collections::HashMap;

use serenity::all::{Command, Interaction, Ready};
use serenity::async_trait;
use serenity::builder::CreateEmbed;
use serenity::client::{Context, EventHandler};
use tracing::{error, info};

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};

pub type CommandCollection = HashMap<&'static str, Box<dyn SlashCommand + Send + Sync>>;

pub struct Handler {
  pub commands: CommandCollection,
  pub database: Database
}

impl Handler {
  pub fn new(database: Database) -> Self {
    Self {
      commands: Handler::build_commands(), // Should this be on Handler or not?
      database
    }
  }
}

#[async_trait]
impl EventHandler for Handler {
  async fn interaction_create(&self, ctx: Context, interaction: Interaction) {
    match interaction {
      Interaction::Command(command) => match self.commands.get(command.data.name.as_str()) {
        Some(client_command) => {
          if let Err(why) = client_command.execute(&ctx, &command, &self.database).await {
            let embed = CreateEmbed::new()
              .color(Colors::Red)
              .title("Encountered an error while running command")
              .field("Error message", why.to_string(), false);

            let _ = command.reply_embed(ctx, embed).await;
            error!("Encountered an error while executing command:\n{why:?}");
          }

          let command_name = vec![command.data.name.clone()]
            .into_iter()
            .chain(command.get_subcommand_group().map(|group| group.name))
            .chain(command.get_subcommand().map(|subcommand| subcommand.name))
            .collect::<Vec<_>>()
            .join(" ");

          info!(
            "{} ({}) executed command {}",
            command.user.name, command.user.id, &command_name
          );

          let _ = self
            .database
            .increment_command_usage(command_name, command.guild_id, command.user.id)
            .await;
        }

        None => error!("Unknown interaction:\n{command:?}")
      },

      Interaction::Autocomplete(autocomplete) => match self.commands.get(autocomplete.data.name.as_str()) {
        Some(client_command) => {
          if let Err(why) = client_command.autocomplete(&ctx, &autocomplete, &self.database).await {
            error!("Encountered an error while responding to autocomplete:\n{why:?}");
          }
        }

        None => error!("Unknown interaction:\n{autocomplete:?}")
      },

      _ => ()
    }
  }

  async fn ready(&self, ctx: Context, ready: Ready) {
    info!("Registering commands...");

    let commands = self
      .commands
      .values()
      .map(|command| command.register())
      .collect::<Vec<_>>();
    if let Err(why) = Command::set_global_commands(ctx, commands).await {
      error!("Command registration failed:\n{why:?}");
    }

    info!("Ready! Logged in as {}", ready.user.name);
  }
}
