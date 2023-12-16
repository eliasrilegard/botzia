use std::collections::HashMap;

use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommandOption, CreateEmbed};
use serenity::client::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

pub struct Timezone {
  timezones: HashMap<&'static str, &'static str>
}

impl Default for Timezone {
  fn default() -> Self {
    Self {
      timezones: super::timezones()
    }
  }
}

#[async_trait]
impl SlashSubCommand for Timezone {
  fn register(&self) -> CreateCommandOption {
    CreateCommandOption::new(
      CommandOptionType::SubCommandGroup,
      "timezone",
      "Manage default timezone"
    )
    .add_sub_option(CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "list",
      "List all supported timezones"
    ))
    .add_sub_option(CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "get",
      "See what your current set timezone is"
    ))
    .add_sub_option(
      CreateCommandOption::new(CommandOptionType::SubCommand, "set", "Set a custom default timezone").add_sub_option({
        let mut option = CreateCommandOption::new(
          CommandOptionType::String,
          "timezone",
          "The abbreviation of the timezone to set"
        )
        .required(true);
        for &key in self.timezones.keys() {
          option = option.add_string_choice(key, key);
        }
        option // To hell with this implementation
      })
    )
    .add_sub_option(CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "reset",
      "Reset your set timezone"
    ))
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, db: &Database) -> Result<()> {
    let subcommand_name = interaction.get_subcommand().unwrap().name;

    let embed = match subcommand_name.as_str() {
      "list" => {
        // TODO: Sort by offset
        CreateEmbed::new()
          .color(Colors::Blue)
          .title("Supported timezones")
          .fields([
            (
              "Name",
              self.timezones.keys().copied().collect::<Vec<_>>().join("\n"),
              true
            ),
            (
              "UTC Offset",
              self.timezones.values().copied().collect::<Vec<_>>().join("\n"),
              true
            )
          ])
      }

      "get" => {
        let user_timezone = db
          .get_user_timezone(interaction.user.id)
          .await
          .unwrap_or("".to_string());

        CreateEmbed::new()
          .color(Colors::Blue)
          .title("Current timezone")
          .description(format!("Your current set timezone is UTC{}.", user_timezone))
      }

      "set" => {
        let timezone = interaction.get_string("timezone").unwrap();
        let utc_offset = self.timezones.get(timezone.as_str()).unwrap().to_owned();

        db.set_user_timezone(interaction.user.id, utc_offset.to_string())
          .await?;

        CreateEmbed::new()
          .color(Colors::Green)
          .title("Timezone set")
          .description(format!("Your offset is now UTC{}.", utc_offset))
      }

      "reset" => {
        db.remove_user_timezone(interaction.user.id).await?;

        CreateEmbed::new()
          .color(Colors::Green)
          .title("Timezone reset")
          .description("Your default timezone has been reset to UTC.")
      }

      _ => unreachable!()
    };

    interaction.reply_embed(ctx, embed).await?;

    Ok(())
  }
}
