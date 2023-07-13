use super::NamedSubCommands;

mod ltrange;
mod res;

pub fn commands() -> NamedSubCommands {
  vec![
    ("ltrange", Box::new(ltrange::LTRange::default())),
    ("res", Box::new(res::Res::default()))
  ]
}