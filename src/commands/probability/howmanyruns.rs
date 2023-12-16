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

#[derive(Default)]
pub struct HowManyRuns;

#[async_trait]
impl SlashSubCommand for HowManyRuns {
  fn register(&self) -> CreateCommandOption {
    CreateCommandOption::new(
      CommandOptionType::SubCommand,
      "howmanyruns",
      "Calculate number of runs required to obtain an item with a given drop chance"
    )
    .add_sub_option(
      CreateCommandOption::new(
        CommandOptionType::String,
        "probability",
        "A decimal number or fraction between 0 and 1 (not inclusive)"
      )
      .required(true)
    )
    .add_sub_option(
      CreateCommandOption::new(
        CommandOptionType::Integer,
        "items-per-run",
        "The number of items you get in a single run/attempt"
      )
      .min_int_value(1)
    )
    .add_sub_option(
      CreateCommandOption::new(
        CommandOptionType::Number,
        "minutes-per-run",
        "The number of minutes to complete a single run"
      )
      .min_number_value(0.01)
    )
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let probability_input = interaction.get_string("probability").unwrap().replace(' ', "");
    let items_per_run = interaction.get_integer("items-per-run");
    let time_per_run = interaction.get_number("minutes-per-run");

    let probability = match verify_probability(probability_input.as_str()) {
      Some(parsed) => parsed,
      None => {
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Invalid format")
          .description("The argument `probability` must be a decimal number or a fraction, and be between 0 and 1.");

        interaction.reply_embed_ephemeral(ctx, embed).await?;
        return Ok(());
      }
    };

    // TODO: Let user specify own set of sample percentages (basically customize this list)
    let probabilities = [10, 25, 50, 75, 90, 95, 99];

    //
    // Probability p of getting at least 1 success in n runs
    // p = 1 - (1 - probabilityOfSuccess) ^ n
    //   =>
    // n = ln(1 - p) / ln(1 - probabilityOfSuccess)
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
      .map(|&n| format_float(n as f32, 0))
      .collect::<Vec<_>>();
    items_display.insert(0, "Items".to_string());

    let mut data = vec![pad_strings(&probabilities_display), pad_strings(&items_display)];

    let mut description =
      vec!["**Items**: The total amount of items to have an X% chance of at least 1 rare drop".to_string()];

    if let Some(items) = items_per_run {
      description.push(format!(
        "**Runs**: The amount of runs required, assuming **{items}** items per run"
      ));
      let mut runs_required = items_required
        .iter()
        .map(|&n| format_float(n as f32 / items as f32, 0))
        .collect::<Vec<_>>();
      runs_required.insert(0, "Runs".to_string());
      data.push(pad_strings(&runs_required));
    }

    if let Some(time) = time_per_run {
      description.push(format!(
        "**Hours**: The time spent farming, assuming one run takes **{}** minutes",
        time
      ));
      let mut time_required = items_required
        .iter()
        .map(|&n| {
          let time = n as f32 * time as f32 / (60_f32 * items_per_run.unwrap_or(1) as f32);
          format_float(time, 1)
        })
        .collect::<Vec<_>>();
      time_required.insert(0, "Hours".to_string());
      data.push(pad_strings(&time_required));
    }

    let mut prepared = transpose(data).iter().map(|row| row.join("   ")).collect::<Vec<_>>();
    prepared.insert(1, "".to_string()); // Spacer
    let content = format!("```{}```", prepared.join("\n"));

    let embed = CreateEmbed::new()
      .color(Colors::Blue)
      .title("Drop Chance Analysis")
      .description(description.join("\n"))
      .field(
        format!("For an item with a drop chance of **{probability_input}**, here are the relevant rates"),
        content,
        false
      );

    interaction.reply_embed(ctx, embed).await?;
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

fn pad_strings<T: ToString>(array: &[T]) -> Vec<String> {
  let length = longest_string(array);

  array
    .iter()
    .map(|e| format!("{: >1$}", e.to_string(), length))
    .collect::<Vec<_>>()
}

fn longest_string<T: ToString>(array: &[T]) -> usize {
  array.iter().map(|e| e.to_string().len()).max().unwrap()
}

fn transpose<T: Clone>(matrix: Vec<Vec<T>>) -> Vec<Vec<T>> {
  (0..matrix[0].len())
    .map(|i| matrix.iter().map(|inner| inner[i].clone()).collect::<Vec<T>>())
    .collect()
}

/// Format a floating point number to a specific precision, spacing out every 3rd digit
///
/// Examples: (`31415.9265`, `2`) -> `"31 415.93"`
fn format_float(input: f32, decimal_count: usize) -> String {
  let scaled = input * 10_i32.pow(decimal_count as u32) as f32;
  let literal = scaled.round().to_string();
  let reversed = literal.chars().rev().collect::<String>();
  let mut data = format!("{:0<1$}", reversed, decimal_count + 1);

  let mut index = if decimal_count > 0 {
    data.insert(decimal_count, '.');
    decimal_count + 4
  } else {
    decimal_count + 3
  };

  while index < data.len() {
    data.insert(index, ' ');
    index += 4;
  }

  data.chars().rev().collect::<String>()
}
