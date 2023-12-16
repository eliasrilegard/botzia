use std::time::Duration;

use async_recursion::async_recursion;
use base64::engine::general_purpose::STANDARD;
use base64::engine::Engine as _;
use chrono::Utc;
use rand::seq::SliceRandom;
use rand::Rng;
use serde::Deserialize;
use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{
  CreateCommand,
  CreateCommandOption,
  CreateEmbed,
  CreateEmbedFooter,
  CreateInteractionResponseFollowup
};
use serenity::client::Context;
use serenity::futures::StreamExt;
use serenity::model::prelude::ReactionType;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{BetterResponse, InteractionCustomGet};
use crate::Result;

#[derive(Deserialize)]
struct TriviaResponse {
  response_code: i32,
  results: Vec<TriviaQuestion>
}

#[derive(Clone, Deserialize)]
struct TriviaQuestion {
  category: String,
  #[serde(rename = "type")]
  kind: String,
  difficulty: String,
  question: String,
  correct_answer: String,
  incorrect_answers: Vec<String>
}

#[derive(Default)]
pub struct Trivia;

#[async_trait]
impl SlashCommand for Trivia {
  fn register(&self) -> CreateCommand {
    CreateCommand::new("trivia")
      .description("Trivia command using OTDB")
      .add_option(
        CreateCommandOption::new(CommandOptionType::SubCommand, "play", "Play a round of trivia").add_sub_option(
          CreateCommandOption::new(
            CommandOptionType::String,
            "category",
            "Request a question from a specific category"
          )
        )
      )
      .add_option(CreateCommandOption::new(
        CommandOptionType::SubCommand,
        "categories",
        "List all categories"
      ))
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, db: &Database) -> Result<()> {
    let trivia_categories = db.get_trivia_categories().await?;

    if interaction.get_subcommand().unwrap().name == "categories" {
      let mut categories = trivia_categories
        .iter()
        .map(|category| category.name.clone())
        .collect::<Vec<_>>();
      categories.sort();

      let (left, right) = categories.split_at((categories.len() + 1) / 2);

      let embed = CreateEmbed::new().color(Colors::Blue).title("All categories").fields([
        ("Here's a list of all categories", left.join("\n"), true),
        ("\u{200b}", right.join("\n"), true)
      ]);

      interaction.reply_embed(ctx, embed).await?;
      return Ok(());
    }

    let category_id = interaction.get_string("category").and_then(|input| {
      let available = trivia_categories
        .iter()
        .filter(|category| category.name.contains(&input))
        .collect::<Vec<_>>();
      if !available.is_empty() {
        let random_index = rand::thread_rng().gen_range(0..available.len());
        Some(available[random_index].id)
      } else {
        None
      }
    });

    let question = match get_question(interaction, category_id, db).await {
      Ok(question) => decode_question(question),
      Err(why) => {
        let embed = CreateEmbed::new()
          .color(Colors::Red)
          .title("Encountered an error")
          .description("Could not retrieve a question")
          .field("Error message", why.to_string(), false);

        interaction.reply_embed(ctx, embed).await?;
        return Ok(());
      }
    };

    let (difficulty, color) = match question.difficulty.as_str() {
      "easy" => ("An Easy", Colors::Green),
      "medium" => ("A Medium", Colors::Orange),
      "hard" => ("A Hard", Colors::Red),
      _ => unreachable!()
    };
    let description = format!("{difficulty} one from the category {}.", question.category);

    let mut answers = question.incorrect_answers.clone();
    answers.push(question.correct_answer.clone());
    match question.kind.as_str() {
      "boolean" => {
        answers.sort();
        answers.reverse();
      }
      "multiple" => {
        answers.shuffle(&mut rand::thread_rng());
      }
      _ => unreachable!()
    }

    let mut emotes: Vec<ReactionType> = ['🍎', '🍐', '🍊', '🍋']
      .iter()
      .map(|&emote| emote.into())
      .collect::<Vec<_>>();
    // emotes.shuffle(&mut rand::thread_rng());
    emotes.truncate(answers.len());

    let mut choices: Vec<String> = vec![];
    for i in 0..answers.len() {
      choices.push(format!("{} - {}", emotes[i], answers[i]))
    }

    let correct_index = answers
      .iter()
      .position(|answer| answer == &question.correct_answer)
      .unwrap();
    let correct_emote = emotes[correct_index].clone();

    let user_name = if let Some(member) = &interaction.member {
      member.display_name().to_string()
    } else {
      interaction.user.name.clone()
    };

    let embed = CreateEmbed::new()
      .color(color)
      .title(format!("{user_name}, here's a question!"))
      .description(description)
      .fields([
        ("Question", question.question, false),
        ("Choices", choices.join("\n"), false)
      ])
      .footer(CreateEmbedFooter::new("Answer by reacting to the corresponding emote"))
      .timestamp(Utc::now());

    interaction.reply_embed(ctx, embed).await?;
    let message = interaction.get_response(ctx).await?;

    for emote in &emotes {
      message.react(ctx, emote.clone()).await?;
    }

    let mut collector = message
      .await_reactions(ctx)
      .author_id(interaction.user.id)
      .filter(move |reaction| emotes.contains(&reaction.emoji))
      .timeout(Duration::from_secs(25))
      .stream();

    let embed = if let Some(reaction) = collector.next().await {
      if reaction.emoji == correct_emote {
        CreateEmbed::new()
          .color(Colors::Green)
          .title("Correct answer!")
          .description("That's correct, well done!")
      } else {
        CreateEmbed::new()
          .color(Colors::Red)
          .title("Incorrect answer")
          .description(format!(
            "Sorry, but that's incorrect.\nThe correct answer was {}.",
            question.correct_answer
          ))
          .footer(CreateEmbedFooter::new("Better luck next time!"))
      }
    } else {
      message.delete_reactions(ctx).await?;
      CreateEmbed::new()
        .color(Colors::Orange)
        .title("Time's up!")
        .description(format!(
          "You ran out of time!\nThe correct answer was {}.",
          question.correct_answer
        ))
    };

    let builder = CreateInteractionResponseFollowup::new().embed(embed);
    interaction.create_followup(ctx, builder).await?;

    Ok(())
  }
}

#[async_recursion]
async fn get_question(
  interaction: &CommandInteraction,
  category_id: Option<i32>,
  db: &Database
) -> Result<TriviaQuestion> {
  let token = db
    .get_server_token(interaction.guild_id.unwrap_or_default().get())
    .await?;
  let id = category_id.map_or(String::default(), |id| format!("&category={id}"));

  let url = format!("https://opentdb.com/api.php?amount=1{id}&encode=base64&token={token}");
  let response = reqwest::get(url).await?;
  let data = response.json::<TriviaResponse>().await?;
  // FIXME:
  // error decoding response body: missing field results at line 1 column 31
  // error decoding response body: invalid type: integer 0, expected a string at line 1 column 18

  match data.response_code {
    0 => Ok(data.results[0].clone()),
    1 => Err("No question found".into()),
    2 => Err("Invalid request argument".into()),
    3 | 4 => {
      // 3: Token not found
      // 4: Questions exhausted
      db.regenerate_server_token(interaction.guild_id.unwrap_or_default().get())
        .await?;
      get_question(interaction, category_id, db).await
    }
    _ => unreachable!()
  }
}

fn decode_question(question: TriviaQuestion) -> TriviaQuestion {
  // TODO: This could be an impl
  TriviaQuestion {
    category: b64_decode(question.category),
    kind: b64_decode(question.kind),
    difficulty: b64_decode(question.difficulty),
    question: b64_decode(question.question),
    correct_answer: b64_decode(question.correct_answer),
    incorrect_answers: question
      .incorrect_answers
      .iter()
      .map(|ans| b64_decode(ans.clone()))
      .collect::<Vec<_>>()
  }
}

fn b64_decode(input: String) -> String {
  let decoded = STANDARD.decode(input).unwrap();
  std::str::from_utf8(&decoded).unwrap().to_string()
}
