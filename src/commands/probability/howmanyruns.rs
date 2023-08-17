use regex::Regex;
use serenity::async_trait;
use serenity::builder::{CreateApplicationCommandOption, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;
use thousands::Separable;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Default)]
pub struct HowManyRuns;

#[async_trait]
impl SlashSubCommand for HowManyRuns {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommand)
      .name("howmanyruns")
      .description("Calculate number of runs required to obtain an item with a given drop chance")
      .create_sub_option(|option| {
        option
          .kind(CommandOptionType::String)
          .name("probability")
          .description("A decimal number or fraction between 0 and 1 (not inclusive)")
          .required(true)
      })
      .create_sub_option(|option| {
        option
          .kind(CommandOptionType::Integer)
          .name("items-per-run")
          .description("The number of items you get in a single run")
          .min_int_value(1)
      })
      .create_sub_option(|option| {
        option
          .kind(CommandOptionType::Number)
          .name("time-per-run")
          .description("The time (in minutes) to complete a single run")
          .min_number_value(0.01)
      })
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let probability_input = interaction.get_string("probability").unwrap();
    let items_per_run = interaction.get_integer("items-per-run");
    let time_per_run = interaction.get_number("time-per-run");

    let verified = verify_probability(probability_input.as_str());
    if verified.is_none() {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Red)
        .title("Invalid format")
        .description("The argument `probability` must be a decimal number or a fraction, and be between 0 and 1.");

      interaction
        .reply(&ctx.http, |msg| msg.set_embed(embed).ephemeral(true))
        .await?;
      return Ok(());
    }
    let probability = verified.unwrap();

    let probabilities = vec![10, 25, 50, 75, 90, 95, 99];

    //
    // Probability p of getting at least 1 success in n runs
    // p = 1 - (1 - probabilityOfSuccess) ^ n
    // n = ln(1 - p) / ln(1 - probabilityOfSuccess)
    // @returns n
    //
    let attempts_required = |p: f32| ((1_f32 - p).ln() / (1_f32 - probability).ln()).round() as i32;

    let items_required = probabilities
      .iter()
      .map(|&p| attempts_required(p as f32 / 100_f32))
      .collect::<Vec<_>>();

    let mut probabilities_display = probabilities.iter().map(|p| format!("{p}%")).collect::<Vec<_>>();
    probabilities_display.insert(0, "Prob".to_string());

    let mut items_display = items_required
      .iter()
      .map(|n| n.separate_with_spaces())
      .collect::<Vec<_>>();
    items_display.insert(0, "Items".to_string());

    let minimum_width = 6;
    let mut data: Vec<Vec<String>> = vec![
      pad_strings(&probabilities_display, 0),
      pad_strings(&items_display, minimum_width),
    ];

    let mut description =
      vec!["Items: The total amount of items to have an X% chance of at least 1 rare drop".to_string()];

    if let Some(items) = items_per_run {
      description.push(format!(
        "Runs: The number of runs required, assuming **${items}** items per run"
      ));
      let mut runs_required = items_required
        .iter()
        .map(|&n| ((n as f32 / items as f32).round() as i32).separate_with_spaces())
        .collect::<Vec<_>>();
      runs_required.insert(0, "Runs".to_string());
      data.push(pad_strings(&runs_required, minimum_width));
    }

    if let Some(time) = time_per_run {
      description.push(format!(
        "Hours: The number of hours spent farming, assuming one run takes **${time}** minutes"
      ));
      let mut time_required = items_required
        .iter()
        .map(|&n| {
          let formatted = format!(
            "{:.1}",
            (n as f32 * time as f32 / (60_f32 * items_per_run.unwrap_or(1) as f32))
          );
          let parsed = formatted.parse::<f32>().unwrap();
          parsed.separate_with_spaces()
        })
        .collect::<Vec<_>>();
      time_required.insert(0, "Time".to_string());
      data.push(pad_strings(&time_required, minimum_width));
    }

    let mut prepared = transpose(data).iter().map(|row| row.join("")).collect::<Vec<_>>();
    prepared.insert(1, "".to_string()); // Spacer
    let content = format!("```{}```", prepared.join("\n"));

    let mut embed = CreateEmbed::default();
    embed
      .color(Colors::Blue)
      .title("Drop Chance Analysis")
      .description(description.join("\n"))
      .field(
        format!("For an item with a drop chance of **{probability_input}**, here are the relevant rates"),
        content,
        false
      );

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}

pub fn verify_probability(input: &str) -> Option<f32> {
  let decimal = Regex::new(r"^0\.\d*[1-9]$").unwrap(); // On form 0.123
  let fraction = Regex::new(r"^[1-9]\d*\/[1-9]\d*$").unwrap(); // On form x/y

  if decimal.is_match(input) {
    Some(input.parse::<f32>().unwrap())
  } else if fraction.is_match(input) {
    let split = input.split('/').collect::<Vec<&str>>();
    let result = split[0].parse::<f32>().unwrap() / split[1].parse::<f32>().unwrap();

    // Require result ∈ (0,1)
    if result > 0.0 && result < 1.0 {
      Some(result)
    } else {
      None
    }
  } else {
    None
  }
}

fn pad_strings<T: ToString>(array: &[T], min_length: usize) -> Vec<String> {
  let length = min_length.max(longest_string(array) + 4);
  array
    .iter()
    .map(|e| format!("{: <1$}", e.to_string(), length))
    .collect::<Vec<String>>()
}

fn longest_string<T: ToString>(array: &[T]) -> usize {
  array.iter().map(|e| e.to_string().len()).min().unwrap()
}

fn transpose<T: Clone>(matrix: Vec<Vec<T>>) -> Vec<Vec<T>> {
  (0..matrix[0].len())
    .map(|i| matrix.iter().map(|inner| inner[i].clone()).collect::<Vec<T>>())
    .collect()
}
