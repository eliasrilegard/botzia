use super::NamedSubCommands;

mod color;
mod levelinfo;
mod ltrange;
mod quote;
mod res;

pub fn commands() -> NamedSubCommands {
  vec![
    ("color", Box::<color::Color>::default()),
    ("levelinfo", Box::<levelinfo::LevelInfo>::default()),
    ("ltrange", Box::<ltrange::LTRange>::default()),
    ("quote", Box::<quote::Quote>::default()),
    ("res", Box::<res::Res>::default()),
  ]
}
