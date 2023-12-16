use std::collections::HashMap;

use chrono::{DateTime, Utc};
use regex::Regex;
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommandOption, CreateEmbed};
use serenity::client::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
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
  fn register(&self) -> CreateCommandOption {
    CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "convert",
      "Convert a timestamp to Discord's dynamic format"
    )
    .add_sub_option(
      CreateCommandOption::new(
        CommandOptionType::String,
        "timestamp",
        "The date (can be omitted) and time of the timestamp: YYYY-MM-DD HH:MM"
      )
      .required(true)
    )
    .add_sub_option({
      let mut option = CreateCommandOption::new(
        CommandOptionType::String,
        "timezone-name",
        "Name of timezone (mutually exclusive with utc-offset"
      );
      for (&name, &value) in &self.timezones {
        option = option.add_string_choice(name, value);
      }
      option // To hell with this implementation
    })
    .add_sub_option(CreateCommandOption::new(
      CommandOptionType::String,
      "utc-offset",
      "Offset from UTC: ±XX:XX (mutually exlusive with timezone-name)"
    ))
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, db: &Database) -> Result<()> {
    // We're given a string that matches ^(\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}$, ie "2023-07-10 12:28" or "12:28"
    // We want to convert that into a unix timestamp, but also take into account the user's timezone

    let timestamp = interaction.get_string("timestamp").unwrap();
    let timezone_name = interaction.get_string("timezone-name");
    let offset = interaction.get_string("offset");

    let re = Regex::new(r"^((?<date>\d{4}-\d{2}-\d{2})[T\s])?(?<time>\d{2}:\d{2})$").unwrap();

    if !re.is_match(timestamp.as_str()) {
      let embed = CreateEmbed::new()
        .color(Colors::Red)
        .title("Invalid format")
        .description("Make sure the format is `YYYY-MM-DD HH:MM` or just `HH:MM`.");

      interaction.reply_embed(ctx, embed).await?;
      return Ok(());
    }

    let utc_offset = if let Some(key) = timezone_name {
      Some(self.timezones.get(key.as_str()).unwrap().to_string())
    } else if let Some(utc_offset) = offset {
      if !Regex::new(r"[+-]\d{2}:\d{2}").unwrap().is_match(utc_offset.as_str()) {
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Invalid format")
          .description(
            "Specify the offset either using `timezone-name` or with `utc-offset` matching the pattern `±HH:MM`."
          );

        interaction.reply_embed(ctx, embed).await?;
        return Ok(());
      }

      let hour_offset = utc_offset[1..3].parse::<i32>().unwrap();
      if (-12..=14).contains(&hour_offset) {
        let embed = CreateEmbed::default()
          .color(Colors::Red)
          .title("Invalid offet")
          .description("Offsets must lie within the range -12 to +14 (inclusive).");

        interaction.reply_embed(ctx, embed).await?;
        return Ok(());
      }

      Some(utc_offset)
    } else if let Ok(saved_offset) = db.get_user_timezone(interaction.user.id).await {
      Some(saved_offset)
    } else {
      None
    };

    let caps = re.captures(timestamp.as_str()).unwrap();
    let time = caps.name("time").map(|m| m.as_str()).unwrap();
    let (date, date_specified) = if let Some(capture) = caps.name("date") {
      (capture.as_str().to_string(), true)
    } else {
      (Utc::now().date_naive().to_string(), false)
    };

    let dt_string = format!("{date}T{time}:00{}", utc_offset.unwrap_or(String::default()));

    let embed = if let Ok(dt) = DateTime::parse_from_rfc3339(dt_string.as_str()) {
      let timestamp = dt.timestamp();
      let suffix = if date_specified { 'f' } else { 't' };
      let formatted = format!("<t:{timestamp}:{suffix}>");

      CreateEmbed::new().color(Colors::Blue).fields([
        ("Display", &formatted, false),
        ("Raw", &format!("`{formatted}`"), false)
      ])
    } else {
      CreateEmbed::new()
        .color(Colors::Red)
        .title("Something went wrong")
        .description("Couldn't convert the passed arguments. Did you format everything correctly?")
    };

    interaction.reply_embed(ctx, embed).await?;
    Ok(())
  }
}
