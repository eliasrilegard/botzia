use std::collections::HashMap;

use super::NamedSubCommands;

mod convert;
mod timezone;

pub fn commands() -> NamedSubCommands {
  vec![
    ("convert", Box::new(convert::Convert::default())),
    ("timezone", Box::new(timezone::Timezone::default()))
  ]
}

fn timezones() -> HashMap<&'static str, &'static str> {
  let timezones = [
    ("CET", "+01:00"),
    ("CEST", "+02:00"),
    ("EET", "+02:00"),
    ("ACDT", "+10:30"),
    ("ADST", "+09:30")
  ];
  
  HashMap::from(timezones)
}