use std::time::Duration;

use async_recursion::async_recursion;
use base64::engine::Engine as _;
use base64::engine::general_purpose::STANDARD;
use chrono::Utc;
use rand::Rng;
use rand::seq::SliceRandom;
use serde::Deserialize;

use serenity::async_trait;
use serenity::builder::{CreateApplicationCommand, CreateEmbed};
use serenity::futures::StreamExt;
use serenity::model::prelude::ReactionType;
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashCommand;
use crate::database::Database;
use crate::interaction::{InteractionCustomGet, BetterResponse};
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

pub struct Trivia;

impl Default for Trivia {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashCommand for Trivia {
  fn register<'a>(&self, command: &'a mut CreateApplicationCommand) ->  &'a mut CreateApplicationCommand {
    command
      .name("trivia")
      .description("Trivia command using OTDB")
      .create_option(|option| option
        .kind(CommandOptionType::SubCommand)
        .name("play")
        .description("Play a round of trivia")
        .create_sub_option(|option| option
          .kind(CommandOptionType::String)
          .name("category")
          .description("Request a question from a specific category")
        )
      )
      .create_option(|option| option
        .kind(CommandOptionType::SubCommand)
        .name("categories")
        .description("List all categories")
      )
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, db: &Database) -> Result<()> {
    let trivia_categories = db.get_trivia_categories().await?;

    if interaction.get_subcommand().unwrap().name == "categories" {
      let mut categories = trivia_categories.iter().map(|category| category.name.clone()).collect::<Vec<_>>();
      categories.sort();
      
      let (left, right) = categories.split_at((categories.len() + 1) / 2);

      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::Blue)
        .title("All categories")
        .fields([
          ("Here's a list of all categories", left.join("\n"), true),
          ("\u{200b}", right.join("\n"), true)
        ]);
      
      interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
      return Ok(());
    }

    let category_id = if let Some(input) = interaction.get_string("category") {
      let available = trivia_categories.iter().filter(|category| category.name.contains(&input)).collect::<Vec<_>>();
      if available.is_empty() {
        None
      } else {
        let random_index = rand::thread_rng().gen_range(0..available.len());
        Some(available[random_index].id)
      }
    } else {
      None
    };

    let question = match get_question(interaction, category_id, db).await {
      Ok(question) => decode_question(question),
      Err(why) => {
        let mut embed = CreateEmbed::default();
        embed
          .color(Colors::Red)
          .title("Encountered an error")
          .description("Could not retrieve a question")
          .field("Error message", why.to_string(), false);
    
        interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
        return Ok(());
      }
    };

    let (difficulty, color) = match question.difficulty.as_str() {
      "easy" => ("An Easy", Colors::Green),
      "medium" => ("A Medium", Colors::Orange),
      "hard" => ("A Hard", Colors::Red),
      _ => unreachable!()
    };
    let description = format!("{} one from the category {}.", difficulty, question.category);

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

    let mut emotes: Vec<ReactionType> = ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🌶', '🌽', '🥕'].iter().map(|&emote| emote.into()).collect::<Vec<_>>();
    emotes.shuffle(&mut rand::thread_rng());
    emotes.truncate(answers.len());

    let mut choices: Vec<String> = vec![];
    for i in 0..answers.len() {
      choices.push(format!("{} - {}", emotes[i], answers[i]))
    }
    
    let correct_index = answers.iter().position(|answer| answer == &question.correct_answer).unwrap();
    let correct_emote = emotes[correct_index].clone();

    let user_name = if let Some(member) = &interaction.member {
      member.display_name().to_string()
    } else {
      interaction.user.name.clone()
    };

    let mut embed = CreateEmbed::default();
    embed
      .color(color)
      .title(format!("{}, here's a question!", user_name))
      .description(description)
      .fields([
        ("Question", question.question, false),
        ("Choices", choices.join("\n"), false)
      ])
      .footer(|footer| footer.text("Answer by reacting to the corresponding emote"))
      .timestamp(Utc::now());

    interaction.reply(&ctx.http, |msg| msg.set_embed(embed)).await?;
    let message = interaction.get_interaction_response(&ctx.http).await?;

    for emote in &emotes {
      message.react(&ctx.http, emote.clone()).await?;
    }

    let mut collector = message.await_reactions(ctx)
      .author_id(interaction.user.id)
      .collect_limit(1)
      .filter(move |reaction| emotes.contains(&reaction.emoji))
      .timeout(Duration::from_secs(25))
      .build();

    let mut embed = CreateEmbed::default();
    if let Some(action) = collector.next().await {
      if action.as_inner_ref().emoji == correct_emote {
        embed
          .color(Colors::Green)
          .title("Correct answer!")
          .description("That's correct, well done!");
      } else {
        embed
          .color(Colors::Red)
          .title("Incorrect answer")
          .description(format!("Sorry, but that's incorrect.\nThe correct answer was {}.", question.correct_answer))
          .footer(|footer| footer.text("Better luck next time!"));
      }
    } else {
      message.delete_reactions(&ctx.http).await?;
      embed
        .color(Colors::Orange)
        .title("Time's up!")
        .description(format!("You ran out of time!\nThe correct answer was {}.", question.correct_answer));
    }

    interaction.create_followup_message(&ctx.http, |msg| msg.set_embed(embed)).await?;
    Ok(())
  }
}

#[async_recursion]
async fn get_question(interaction: &ApplicationCommandInteraction, category_id: Option<i32>, db: &Database) -> Result<TriviaQuestion> {
  let token = db.get_server_token(interaction.guild_id.unwrap_or_default().0).await?;
  let id = if let Some(id) = category_id {
    format!("&category={}", id)
  } else {
    "".to_string()
  };

  let url = format!("https://opentdb.com/api.php?amount=1{}&encode=base64&token={}", id, token);
  let response = reqwest::get(url).await?;
  let data = response.json::<TriviaResponse>().await?;

  match data.response_code {
    0 => Ok(data.results[0].clone()),
    1 => Err("No question found".into()),
    2 => Err("Invalid request argument".into()),
    3 | 4 => {
      // 3: Token not found
      // 4: Questions exhausted
      db.regenerate_server_token(interaction.guild_id.unwrap_or_default().0).await?;
      get_question(interaction, category_id, db).await
    },
    _ => unreachable!()
  }
}

fn decode_question(question: TriviaQuestion) -> TriviaQuestion { // This could be an impl
  TriviaQuestion {
    category: b64_decode(question.category),
    kind: b64_decode(question.kind),
    difficulty: b64_decode(question.difficulty),
    question: b64_decode(question.question),
    correct_answer: b64_decode(question.correct_answer),
    incorrect_answers: question.incorrect_answers.iter().map(|ans| b64_decode(ans.clone())).collect::<Vec<_>>()
  }
}

fn b64_decode(input: String) -> String {
  let decoded = STANDARD.decode(input).unwrap();
  std::str::from_utf8(&decoded).unwrap().to_string()
}