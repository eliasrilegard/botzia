use std::collections::HashMap;

use serenity::async_trait;
use serenity::builder::{CreateApplicationCommandOption, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{InteractionCustomGet, BetterResponse};
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
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommandGroup)
      .name("timezone")
      .description("Manage default timezone")
      .create_sub_option(|option| option
        .kind(CommandOptionType::SubCommand)
        .name("list")
        .description("List all supported timezones")
      )
      .create_sub_option(|option| option
        .kind(CommandOptionType::SubCommand)
        .name("get")
        .description("See what your current default timezone is")
      )
      .create_sub_option(|option| option
        .kind(CommandOptionType::SubCommand)
        .name("set")
        .description("Set a custom default timezone")
        .create_sub_option(|option| {
          // Might want to rework this option, if using API
          for &key in self.timezones.keys() {
            option.add_string_choice(key, key);
          }
          option
            .kind(CommandOptionType::String)
            .name("timezone")
            .description("The abbreviation of the timezone to set")
            .required(true)
        })
      )
      .create_sub_option(|option| option
        .kind(CommandOptionType::SubCommand)
        .name("reset")
        .description("Reset your default timezone")
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()> {
    let subcommand_name = interaction.get_subcommand().unwrap().name;

    let mut embed = CreateEmbed::default();

    match subcommand_name.as_str() {
      "list" => {
        // TODO: Sort by offset
        embed
          .color(Colors::Blue)
          .title("Supported timezones")
          .fields([
            ("Name", self.timezones.keys().copied().collect::<Vec<_>>().join("\n"), true),
            ("UTC Offset", self.timezones.values().copied().collect::<Vec<_>>().join("\n"), true)
          ]);
      },

      "get" => {
        let user_timezone = db.get_user_timezone(interaction.user.id).await.unwrap_or("".to_string());

        embed
          .color(Colors::Blue)
          .title("Current timezone")
          .description(format!("Your current set timezone is UTC{}.", user_timezone));
      },

      "set" => {
        let timezone = interaction.get_string("timezone").unwrap();
        let utc_offset = self.timezones.get(timezone.as_str()).unwrap().to_owned();

        db.set_user_timezone(interaction.user.id, utc_offset.to_string()).await?;

        embed
          .color(Colors::Green)
          .title("Timezone set")
          .description(format!("Your offset is now UTC{}.", utc_offset));
      },

      "reset" => {
        db.remove_user_timezone(interaction.user.id).await?;

        embed
          .color(Colors::Green)
          .title("Timezone reset")
          .description("Your default timezone has been reset to UTC.");
      },

      _ => unreachable!()
    }

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;

    Ok(())
  }
}