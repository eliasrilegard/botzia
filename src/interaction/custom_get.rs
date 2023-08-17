use serenity::model::application::interaction::autocomplete::AutocompleteInteraction;
use serenity::model::prelude::application_command::CommandData;
use serenity::model::prelude::command::CommandOptionType;
use serenity::model::prelude::interaction::application_command::{
  ApplicationCommandInteraction,
  CommandDataOption,
  CommandDataOptionValue
};
use serenity::model::prelude::{Attachment, PartialChannel, PartialMember, Role};
use serenity::model::user::User;

pub trait InteractionCustomGet {
  fn get_subcommand(&self) -> Option<CommandDataOption>;
  fn get_subcommand_group(&self) -> Option<CommandDataOption>;
  fn get_string(&self, name: &str) -> Option<String>;
  fn get_integer(&self, name: &str) -> Option<i64>;
  fn get_bool(&self, name: &str) -> Option<bool>;
  fn get_user(&self, name: &str) -> Option<(User, Option<PartialMember>)>;
  fn get_channel(&self, name: &str) -> Option<PartialChannel>;
  fn get_role(&self, name: &str) -> Option<Role>;
  fn get_number(&self, name: &str) -> Option<f64>;
  fn get_attachment(&self, name: &str) -> Option<Attachment>;
}

pub trait AutocompleteCustomGet {
  fn get_focused_option(&self) -> CommandDataOption;
  fn get_subcommand(&self) -> Option<CommandDataOption>;
  fn get_subcommand_group(&self) -> Option<CommandDataOption>;
}


fn hoisted_options(data: &CommandData) -> &Vec<CommandDataOption> {
  if let Some(option) = data.options.get(0) {
    match option.kind {
      CommandOptionType::SubCommand => &option.options,
      CommandOptionType::SubCommandGroup => &option.options.get(0).unwrap().options,
      _ => &data.options
    }
  } else {
    &data.options
  }
}


fn get_value<'a>(
  interaction: &'a ApplicationCommandInteraction,
  name: &'a str,
  kind: CommandOptionType
) -> Option<&'a CommandDataOptionValue> {
  // Hoist options to make filtering easier
  let options = hoisted_options(&interaction.data);

  if let Some(found_option) = options.iter().find(|option| option.kind == kind && option.name == name) {
    let value = found_option.resolved.as_ref().expect("No resolved value exists");
    Some(value)
  } else {
    None
  }
}

impl InteractionCustomGet for ApplicationCommandInteraction {
  fn get_subcommand(&self) -> Option<CommandDataOption> {
    // Hoist potential subcommand group options
    let options = if let Some(group) = self
      .data
      .options
      .iter()
      .find(|option| option.kind == CommandOptionType::SubCommandGroup)
    {
      let mut options = self.data.options.clone();
      options.extend(group.options.clone());
      options
    } else {
      self.data.options.clone()
    };

    let option = options
      .iter()
      .find(|option| option.kind == CommandOptionType::SubCommand);
    option.map(|subcommand| subcommand.to_owned())
  }

  fn get_subcommand_group(&self) -> Option<CommandDataOption> {
    let option = self
      .data
      .options
      .iter()
      .find(|option| option.kind == CommandOptionType::SubCommandGroup);
    option.map(|subcommand_group| subcommand_group.to_owned())
  }

  fn get_string(&self, name: &str) -> Option<String> {
    if let Some(CommandDataOptionValue::String(value)) = get_value(self, name, CommandOptionType::String) {
      Some(value.to_owned())
    } else {
      None
    }
  }

  fn get_integer(&self, name: &str) -> Option<i64> {
    if let Some(CommandDataOptionValue::Integer(value)) = get_value(self, name, CommandOptionType::Integer) {
      Some(value.to_owned())
    } else {
      None
    }
  }

  fn get_bool(&self, name: &str) -> Option<bool> {
    if let Some(CommandDataOptionValue::Boolean(value)) = get_value(self, name, CommandOptionType::Boolean) {
      Some(value.to_owned())
    } else {
      None
    }
  }

  fn get_user(&self, name: &str) -> Option<(User, Option<PartialMember>)> {
    if let Some(CommandDataOptionValue::User(user, partial_member)) = get_value(self, name, CommandOptionType::User) {
      Some((user.to_owned(), partial_member.to_owned()))
    } else {
      None
    }
  }

  fn get_channel(&self, name: &str) -> Option<PartialChannel> {
    if let Some(CommandDataOptionValue::Channel(channel)) = get_value(self, name, CommandOptionType::Channel) {
      Some(channel.to_owned())
    } else {
      None
    }
  }

  fn get_role(&self, name: &str) -> Option<Role> {
    if let Some(CommandDataOptionValue::Role(role)) = get_value(self, name, CommandOptionType::Role) {
      Some(role.to_owned())
    } else {
      None
    }
  }

  fn get_number(&self, name: &str) -> Option<f64> {
    if let Some(CommandDataOptionValue::Number(value)) = get_value(self, name, CommandOptionType::Number) {
      Some(value.to_owned())
    } else {
      None
    }
  }

  fn get_attachment(&self, name: &str) -> Option<Attachment> {
    if let Some(CommandDataOptionValue::Attachment(attachment)) = get_value(self, name, CommandOptionType::Attachment) {
      Some(attachment.to_owned())
    } else {
      None
    }
  }
}


impl AutocompleteCustomGet for AutocompleteInteraction {
  fn get_focused_option(&self) -> CommandDataOption {
    let options = hoisted_options(&self.data);
    options.iter().find(|option| option.focused).unwrap().clone()
  }

  fn get_subcommand(&self) -> Option<CommandDataOption> {
    // Hoist potential subcommand group options
    let options = if let Some(group) = self
      .data
      .options
      .iter()
      .find(|option| option.kind == CommandOptionType::SubCommandGroup)
    {
      let mut options = self.data.options.clone();
      options.extend(group.options.clone());
      options
    } else {
      self.data.options.clone()
    };

    let option = options
      .iter()
      .find(|option| option.kind == CommandOptionType::SubCommand);
    option.map(|subcommand| subcommand.to_owned())
  }

  fn get_subcommand_group(&self) -> Option<CommandDataOption> {
    let option = self
      .data
      .options
      .iter()
      .find(|option| option.kind == CommandOptionType::SubCommandGroup);
    option.map(|subcommand_group| subcommand_group.to_owned())
  }
}
