use regex::Regex;
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommand, CreateCommandOption, CreateEmbed};
use serenity::client::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::pager::InteractiveMenu;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct CommandStats;

#[async_trait]
impl SlashCommand for CommandStats {
  fn register(&self) -> CreateCommand {
    CreateCommand::new("commandstats")
      .description("View usage statistics on a command")
      .dm_permission(false)
      .add_option(
        CreateCommandOption::new(
          CommandOptionType::String,
          "command-name",
          "The full name of the command to view stats for"
        )
        .required(true)
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, db: &Database) -> Result<()> {
    let re = Regex::new(r"\s+").unwrap();
    let input = interaction.get_string("command-name").unwrap();
    let command_name = re
      .split(input.as_str())
      .filter(|m| !m.is_empty())
      .collect::<Vec<_>>()
      .join(" "); // Sanitize

    match db.get_command_usage(command_name.clone(), interaction.guild_id).await {
      Ok(result) => {
        let embeds = result
          .chunks(20)
          .map(|stats| {
            let names = stats.iter().map(|(id, _)| format!("<@{id}>")).collect::<Vec<_>>();
            let usage = stats.iter().map(|(_, count)| count.to_string()).collect::<Vec<_>>();

            CreateEmbed::new()
              .color(Colors::Blue)
              .title("Top Usage")
              .description(format!("Command: `/{command_name}`"))
              .fields([("Name", names.join("\n"), true), ("Usage", usage.join("\n"), true)])
          })
          .collect::<Vec<_>>();

        if embeds.len() > 1 {
          interaction.send_menu(ctx, embeds).await?;
        } else {
          interaction.reply_embed(ctx, embeds[0].clone()).await?;
        }
      }

      Err(_) => {
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Command stats not found")
          .description("No stats for that command found in this server.\nDid you spell & format everything correctly?");

        interaction.reply_embed_ephemeral(ctx, embed).await?;
      }
    }

    Ok(())
  }
}
