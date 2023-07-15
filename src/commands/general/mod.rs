use super::NamedCommands;

mod avatar;
mod commandstats;
mod poll;
mod spongetext;

pub fn commands() -> NamedCommands {
  vec![
    ("avatar", Box::new(avatar::Avatar::default())),
    ("commandstats", Box::new(commandstats::CommandStats::default())),
    ("poll", Box::new(poll::Poll::default())),
    ("spongetext", Box::new(spongetext::SpongeText::default()))
  ]
}