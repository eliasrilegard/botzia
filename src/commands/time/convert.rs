use std::collections::HashMap;

use chrono::{DateTime, Utc};

use regex::Regex;

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

pub struct Convert {
  timezones: HashMap<&'static str, &'static str>
}

impl Default for Convert {
  fn default() -> Self {
    Self {
      timezones: super::timezones()
    }
  }
}

#[async_trait]
impl SlashSubCommand for Convert {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommand)
      .name("convert")
      .description("Convert a timestamp to Discord's dynamic format")
      .create_sub_option(|option| option
        .kind(CommandOptionType::String)
        .name("timestamp")
        .description("The date (can be omitted) and time of the timestamp: YYYY-MM-DD HH:MM")
        .required(true)
      )
      .create_sub_option(|option| {
        for (&name, &value) in &self.timezones {
          option.add_string_choice(name, value);
        }
        option
          .kind(CommandOptionType::String)
          .name("timezone-name")
          .description("Name of timezone (mutually exclusive with utc-offset)")
      })
      .create_sub_option(|option| option
        .kind(CommandOptionType::String)
        .name("utc-offset")
        .description("Offset from UTC: ±XX:XX (mutually exlusive with timezone-name)")
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()> {
    // We're given a string that matches ^(\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}$, ie "2023-07-10 12:28" or "12:28"
    // We want to convert that into a unix timestamp, but also take into account the user's timezone

    let timestamp = interaction.get_string("timestamp").unwrap();
    let timezone_name = interaction.get_string("timezone-name");
    let offset = interaction.get_string("offset");

    let re = Regex::new(r"^((?<date>\d{4}-\d{2}-\d{2})[T\s])?(?<time>\d{2}:\d{2})$").unwrap();

    if !re.is_match(timestamp.as_str()) {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::RED)
        .title("Invalid format")
        .description("Make sure the format is `YYYY-MM-DD HH:MM` or just `HH:MM`.");

      interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
      return Ok(());
    }
    
    let utc_offset = if let Some(key) = timezone_name {
      Some(self.timezones.get(key.as_str()).unwrap().to_string())
    } else if let Some(utc_offset) = offset {
      if !Regex::new(r"[+-]\d{2}:\d{2}").unwrap().is_match(utc_offset.as_str()) {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::RED)
          .title("Invalid format")
          .description("Specify the offset either using `timezone-name` or with `utc-offset` matching the pattern `±HH:MM`.");

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
        return Ok(());
      }

      let hour_offset = utc_offset[1..3].parse::<i32>().unwrap();
      if (-12..=14).contains(&hour_offset) {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::RED)
          .title("Invalid offet")
          .description("Offsets must lie within the range -12 to +14 (inclusive).");

        interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
        return Ok(());
      }

      Some(utc_offset)
    } else if let Ok(saved_offset) = db.get_user_timezone(interaction.user.id).await {
      Some(saved_offset)
    } else {
      None
    };
    
    let today = Utc::now().date_naive().to_string();

    let caps = re.captures(timestamp.as_str()).unwrap();
    let time = caps.name("time").map(|m| m.as_str()).unwrap();
    let (date, date_specified) = if let Some(cap) = caps.name("date") {
      (cap.as_str(), true)
    } else {
      (today.as_str(), false)
    };

    let dt_string = format!("{}T{}:00{}", date, time, utc_offset.unwrap_or(String::default()));

    let mut embed = CreateEmbed::default();

    if let Ok(dt) = DateTime::parse_from_rfc3339(dt_string.as_str()) {
      let timestamp = dt.timestamp();
      let suffix = if date_specified { 'f' } else { 't' };
      let formatted = format!("<t:{}:{}>", timestamp, suffix);

      embed
        .color(Colors::BLUE)
        .fields([
          ("Display", &formatted, false),
          ("Raw", &format!("`{}`", &formatted), false)
        ]);
    } else {
      embed
        .color(Colors::RED)
        .title("Something went wrong")
        .description("Couldn't convert the passed arguments. Did you format everything correctly?");      
    }
      
    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}