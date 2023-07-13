use super::NamedSubCommands;

mod color;
mod ltrange;
mod res;

pub fn commands() -> NamedSubCommands {
  vec![
    ("color", Box::new(color::Color::default())),
    ("ltrange", Box::new(ltrange::LTRange::default())),
    ("res", Box::new(res::Res::default()))
  ]
}