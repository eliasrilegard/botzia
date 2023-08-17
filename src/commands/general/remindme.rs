use std::fmt;

use chrono::{Duration, Utc};
use regex::Regex;
use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed};
use serenity::model::prelude::application_command::ApplicationCommandInteraction;
use serenity::model::prelude::command::CommandOptionType;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct RemindMe;

#[async_trait]
impl SlashCommand for RemindMe {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) -> &'a mut CreateApplicationCommand {
    command
      .name("remindme")
      .description("Remind you of something after a given time")
      .create_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("timer")
          .description("How long (in days/hours/minutes) until the reminder triggers. Example: 2d, 1 hour, 15 mins")
          .required(true)
      })
      .create_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("message")
          .description("Any message to go along with the reminder")
      })
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()> {
    let time_args = interaction.get_string("timer").unwrap().to_ascii_lowercase();

    let full_test = Regex::new(
      r"^(\d+\s?(d(ays?)?|h(ours?)?|m(in(s|utes?)?)?)[\s,]+)*(\d+\s?(d(ays?)?|h(ours?)?|m(in(s|utes?)?)?))$"
    )
    .unwrap(); // Help, pattern is \d+\s?(d(ays?)?|h(ours?)?|m(in(s|utes?)?)?)
    if !full_test.is_match(time_args.trim()) {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Red)
        .title("Invalid time")
        .description("Check your arguments and make sure everything is well formatted.")
        .fields([
          ("Units", "**Days\nHours\nMinutes**", true),
          ("Abbreviations", "d, day(s)\nh, hour(s)\nm, min(s), minute(s)", true)
        ]);
      interaction
        .reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true))
        .await?;
      return Ok(());
    }

    let time = Time::from_args(time_args);
    let now = Utc::now();
    let due_dt = now + time.duration_secs();

    let mut embed = CreateEmbed::default();
    embed
      .color(Colors::Green)
      .title("Reminder created")
      .description(format!("Got it, I will remind you in {}.", time))
      .timestamp(due_dt);

    let mut mentions = vec![interaction.user.id];
    let message = if let Some(message) = interaction.get_string("message") {
      embed.field("Message", &message, false);

      let re = Regex::new(r"<@!?(?<id>\d{18,19})>").unwrap();
      for cap in re.captures_iter(&message) {
        let user_id = cap.name("id").unwrap().as_str().parse::<u64>().unwrap();
        mentions.push(user_id.into());
      }

      Some(message)
    } else {
      None
    };

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    let ok_message = interaction.get_interaction_response(&ctx.http).await?;

    db.create_reminder(due_dt, interaction.channel_id, ok_message.id, mentions, message)
      .await?;
    Ok(())
  }
}

#[derive(Default)]
struct Time {
  days: i32,
  hours: i32,
  minutes: i32
}

impl Time {
  fn from_args(args: String) -> Self {
    let re = Regex::new(r"(?<amount>\d+)\s?(?<unit>(d(ays?)?|h(ours?)?|m(in(s|utes?)?)?))").unwrap();
    let extracted = re
      .captures_iter(&args)
      .map(|cap| {
        (
          cap.name("amount").unwrap().as_str().parse::<i32>().unwrap(),
          cap.name("unit").unwrap().as_str()
        )
      })
      .collect::<Vec<_>>();

    let mut time = Self::default();
    for (amount, unit) in extracted {
      time.add_time(amount, unit);
    }

    time
  }

  fn add_time(&mut self, amount: i32, unit: &str) {
    match unit.chars().next().unwrap() {
      'd' => self.days += amount,
      'h' => self.hours += amount,
      'm' => self.minutes += amount,
      _ => unreachable!()
    }
  }

  fn duration_secs(&self) -> Duration {
    Duration::seconds(((self.days as i64 * 24 + self.hours as i64) * 60 + self.minutes as i64) * 60)
  }
}

impl fmt::Display for Time {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    let units: Vec<_> = [
      formatter(self.days, "days"),
      formatter(self.hours, "hours"),
      formatter(self.minutes, "minutes")
    ]
    .into_iter()
    .flatten()
    .collect();

    let re = Regex::new(r"(.*), (.*)").unwrap();
    let joined = units.join(", "); // Warn: Blank if all 0
    let res = re.replace(&joined, "$1 and $2");
    write!(f, "{}", res)
  }
}

fn formatter(amount: i32, unit: &str) -> Option<String> {
  if amount != 0 {
    let mut unit = unit.to_string();
    if amount == 1 {
      unit.pop();
    }
    Some(format!("{} {}", amount, unit))
  } else {
    None
  }
}
