use regex::Regex;
use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

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
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand {
    command
      .name("commandstats")
      .description("View usage statistics on a command")
      .dm_permission(false)
      .create_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("command-name")
          .description("The full name of the command to view stats for")
          .required(true)
      })
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()> {
    let re = Regex::new(r"\s+").unwrap();
    let input = interaction.get_string("command-name").unwrap();
    let command_name = re
      .split(input.as_str())
      .filter(|m| !m.is_empty())
      .collect::<Vec<_>>()
      .join(" "); // Sanitize

    let result = db.get_command_usage(command_name.clone(), interaction.guild_id).await;

    if result.is_err() {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Red)
        .title("Command stats not found")
        .description("No stats for that command found in this server.\nDid you spell & format everything correctly?");

      interaction
        .reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true))
        .await?;
      return Ok(());
    }

    let embeds = result
      .unwrap()
      .chunks(20)
      .map(|stats| {
        let mut names: Vec<String> = vec![];
        let mut usage: Vec<String> = vec![];

        for (id, count) in stats {
          names.push(format!("<@{}>", id));
          usage.push(count.to_string());
        }

        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::Blue)
          .title("Top usage")
          .description(format!("Command: `/{}`", &command_name))
          .fields([("Name", names.join("\n"), true), ("Usage", usage.join("\n"), true)]);

        embed
      })
      .collect::<Vec<_>>();

    if embeds.len() > 1 {
      interaction.send_menu(ctx, embeds).await?;
    } else {
      interaction
        .reply(&ctx.http, |msg| msg.set_embed(embeds[0].clone()))
        .await?;
    }
    Ok(())
  }
}
