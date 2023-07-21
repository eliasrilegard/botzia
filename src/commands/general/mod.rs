use super::NamedCommands;

mod avatar;
mod commandstats;
mod poll;
mod remindme;
mod snowflake;
mod spongetext;

pub fn commands() -> NamedCommands {
  vec![
    ("avatar", Box::new(avatar::Avatar::default())),
    ("commandstats", Box::new(commandstats::CommandStats::default())),
    ("poll", Box::new(poll::Poll::default())),
    ("remindme", Box::new(remindme::RemindMe::default())),
    ("snowflake", Box::new(snowflake::Snowflake::default())),
    ("spongetext", Box::new(spongetext::SpongeText::default()))
  ]
}