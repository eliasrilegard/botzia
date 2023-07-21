use serenity::async_trait;
use serenity::builder::{CreateApplicationCommandOption, CreateEmbed};
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::ApplicationCommandInteraction;
use serenity::prelude::Context;

use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::pager::InteractiveMenu;
use crate::Result;

use super::MonsterInfo;

pub struct List;

impl Default for List {
  fn default() -> Self {
    Self
  }
}

#[async_trait]
impl SlashSubCommand for List {
  fn register<'a>(&self, subcommand: &'a mut CreateApplicationCommandOption) -> &'a mut CreateApplicationCommandOption {
    subcommand
      .kind(CommandOptionType::SubCommand)
      .name("list")
      .description("View a list of all monsters")
  }

  async fn execute(&self, ctx: &Context, interaction: &ApplicationCommandInteraction, _: &Database) -> Result<()> {
    let monsters_json = include_str!("../../../assets/monster_hunter_world/monster_data.json");
    let monsters: Vec<MonsterInfo> = serde_json::from_str(monsters_json).expect("JSON was not well formatted");

    let mut monster_names = monsters.iter().map(|monster| monster.details.title.clone()).collect::<Vec<_>>();
    monster_names.sort_by(|a, b| a.cmp(b));

    let embeds = monster_names.chunks(20).map(|chunk| {
      let mut embed = CreateEmbed::default();
      embed
        .color(Colors::BLUE)
        .title("All Monsters")
        .description(chunk.join("\n"));

      embed
    }).collect::<Vec<_>>();

    interaction.send_menu(ctx, embeds).await?;
    Ok(())
  }
}