use super::NamedCommands;

mod ban;
mod kick;
mod massmove;
mod purge;

pub fn commands() -> NamedCommands {
  vec![
    ("ban", Box::<ban::Ban>::default()),
    ("kick", Box::<kick::Kick>::default()),
    ("massmove", Box::<massmove::MassMove>::default()),
    ("purge", Box::<purge::Purge>::default()),
  ]
}
