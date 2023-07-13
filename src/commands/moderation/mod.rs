use super::NamedCommands;

mod ban;
mod massmove;
mod kick;

pub fn commands() -> NamedCommands {
  vec![
    ("ban", Box::new(ban::Ban::default())),
    ("massmove", Box::new(massmove::MassMove::default())),
    ("kick", Box::new(kick::Kick::default()))
  ]
}