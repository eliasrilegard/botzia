use serenity::all::{CommandInteraction, CommandOptionType};
use serenity::async_trait;
use serenity::builder::{CreateCommandOption, CreateEmbed};
use serenity::client::Context;

use super::MonsterInfo;
use crate::color::Colors;
use crate::commands::SlashSubCommand;
use crate::database::Database;
use crate::interaction::pager::InteractiveMenu;
use crate::Result;

#[derive(Default)]
pub struct List;

#[async_trait]
impl SlashSubCommand for List {
  fn register(&self) -> CreateCommandOption {
    CreateCommandOption::new(CommandOptionType::SubCommand, "list", "View a list of all monsters")
  }

  async fn execute(&self, ctx: &Context, interaction: &CommandInteraction, _: &Database) -> Result<()> {
    let monsters_json = include_str!("../../../assets/monster_hunter_world/monster_data.json");
    let monsters: Vec<MonsterInfo> = serde_json::from_str(monsters_json).expect("JSON was not well formatted");

    let mut monster_names = monsters
      .iter()
      .map(|monster| monster.details.title.clone())
      .collect::<Vec<_>>();
    monster_names.sort();

    let embeds = monster_names
      .chunks(20)
      .map(|chunk| {
        CreateEmbed::new()
          .color(Colors::Blue)
          .title("All Monsters")
          .description(chunk.join("\n"))
      })
      .collect::<Vec<_>>();

    interaction.send_menu(ctx, embeds).await?;
    Ok(())
  }
}
