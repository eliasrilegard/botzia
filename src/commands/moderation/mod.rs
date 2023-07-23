use super::NamedCommands;

mod ban;
mod massmove;
mod kick;
mod purge;

pub fn commands() -> NamedCommands {
  vec![
    ("ban", Box::<ban::Ban>::default()),
    ("massmove", Box::<massmove::MassMove>::default()),
    ("kick", Box::<kick::Kick>::default()),
    ("purge", Box::<purge::Purge>::default())
  ]
}