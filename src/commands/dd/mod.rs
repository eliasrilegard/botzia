use super::NamedSubCommands;

mod color;
mod levelinfo;
mod ltrange;
mod res;

pub fn commands() -> NamedSubCommands {
  vec![
    ("color", Box::new(color::Color::default())),
    ("levelinfo", Box::new(levelinfo::LevelInfo::default())),
    ("ltrange", Box::new(ltrange::LTRange::default())),
    ("res", Box::new(res::Res::default()))
  ]
}