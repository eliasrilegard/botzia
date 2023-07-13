use super::NamedCommands;

mod poll;

pub fn commands() -> NamedCommands {
  vec![
    ("poll", Box::new(poll::Poll::default()))
  ]
}