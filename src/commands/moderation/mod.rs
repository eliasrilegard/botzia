use super::NamedCommands;

mod ban;
mod kick;

pub fn commands() -> NamedCommands {
  vec![
    ("ban", Box::new(ban::Ban::default())),
    ("kick", Box::new(kick::Kick::default()))
  ]
}