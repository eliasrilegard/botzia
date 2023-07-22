use std::collections::HashMap;

use serenity::async_trait;
use serenity::model::prelude::command::Command;
use serenity::model::prelude::interaction::Interaction;
use serenity::model::prelude::Ready;
use serenity::prelude::{Context, EventHandler};

use tracing::{error, info};

use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::InteractionCustomGet;

pub struct Handler {
  pub commands: HashMap<String, Box<dyn SlashCommand + Send + Sync>>,
  pub database: Database
}

impl Handler {
  pub fn new(database: Database) -> Self {
    Self {
      commands: HashMap::new(),
      database
    }
  }
}

#[async_trait]
impl EventHandler for Handler {
  async fn interaction_create(&self, ctx: Context, base_interaction: Interaction) {
    match base_interaction {
      Interaction::ApplicationCommand(interaction) => {
        if let Some(command) = self.commands.get(&interaction.data.name) {
          if let Err(why) = command.execute(&ctx, &interaction, &self.database).await {
            error!("Encountered an error while executing a command:\n{:?}", why);
          }

          let mut full_name = vec![interaction.data.name.clone()];
          if let Some(subcommand_group) = interaction.get_subcommand_group() {
            full_name.push(subcommand_group.name);
          }
          if let Some(subcommand) = interaction.get_subcommand() {
            full_name.push(subcommand.name)
          }

          let _ = self.database.increment_command_usage(full_name.join(" "), interaction.guild_id, interaction.user.id).await;
        }
      }

      Interaction::Autocomplete(interaction) => {
        if let Some(command) = self.commands.get(&interaction.data.name) {
          if let Err(why) = command.autocomplete(&ctx, &interaction, &self.database).await {
            error!("Encountered an error while responding to autocomplete:\n{}", why);
          }
        }
      }

      _ => ()
    }
  }

  async fn ready(&self, ctx: Context, ready: Ready) {
    info!("Registering commands...");
    
    if let Err(why) = Command::set_global_application_commands(&ctx.http, |commands| {
      for command in self.commands.values() {
        commands.create_application_command(|builder| command.register(builder));
      }
      commands
    }).await {
      error!("Command registration failed:\n{:?}", why);
    }

    info!("Ready! Logged in as {}", ready.user.tag());
  }
}