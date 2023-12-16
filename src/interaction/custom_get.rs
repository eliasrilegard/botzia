use serenity::all::{
  AttachmentId,
  ChannelId,
  CommandDataOption,
  CommandDataOptionValue,
  CommandInteraction,
  CommandOptionType,
  RoleId,
  UserId
};

pub trait InteractionCustomGet {
  fn get_subcommand(&self) -> Option<CommandDataOption>;
  fn get_subcommand_group(&self) -> Option<CommandDataOption>;
  fn get_string(&self, name: &str) -> Option<String>;
  fn get_integer(&self, name: &str) -> Option<i64>;
  fn get_bool(&self, name: &str) -> Option<bool>;
  fn get_user_id(&self, name: &str) -> Option<UserId>;
  fn get_channel_id(&self, name: &str) -> Option<ChannelId>;
  fn get_role_id(&self, name: &str) -> Option<RoleId>;
  fn get_number(&self, name: &str) -> Option<f64>;
  fn get_attachment(&self, name: &str) -> Option<AttachmentId>;
}


fn get_value(interaction: &CommandInteraction, name: &str, kind: CommandOptionType) -> Option<CommandDataOptionValue> {
  // Hoist options to simplify filtering
  let options = interaction
    .data
    .options
    .first()
    .map_or(interaction.data.options.to_owned(), |option| match option.kind() {
      CommandOptionType::SubCommand => {
        let CommandDataOptionValue::SubCommand(ref subcommand_options) = option.value else {
          unreachable!()
        };
        subcommand_options.to_owned()
      }
      CommandOptionType::SubCommandGroup => {
        let CommandDataOptionValue::SubCommandGroup(ref subcommands) = option.value else {
          unreachable!()
        };
        let CommandDataOptionValue::SubCommand(ref subcommand_options) = subcommands.first().unwrap().value else {
          unreachable!()
        };
        subcommand_options.to_owned()
      }
      _ => interaction.data.options.to_owned()
    });

  options
    .iter()
    .find(|option| option.kind() == kind && option.name == name)
    .map(|option| option.value.to_owned())
}

impl InteractionCustomGet for CommandInteraction {
  fn get_subcommand(&self) -> Option<CommandDataOption> {
    // Hoist potential subcommand group options
    let options = if let Some(option) = self.data.options.first() {
      if option.kind() == CommandOptionType::SubCommandGroup {
        let CommandDataOptionValue::SubCommandGroup(ref subcommands) = option.value else {
          unreachable!()
        };
        subcommands.to_owned() // Is it possible to not clone here?
      } else {
        self.data.options.to_owned()
      }
    } else {
      vec![]
    };

    options.first().and_then(|option| {
      if option.kind() == CommandOptionType::SubCommand {
        Some(option.to_owned())
      } else {
        None
      }
    })
  }

  fn get_subcommand_group(&self) -> Option<CommandDataOption> {
    self.data.options.first().and_then(|option| {
      if option.kind() == CommandOptionType::SubCommandGroup {
        Some(option.to_owned())
      } else {
        None
      }
    })
  }

  fn get_string(&self, name: &str) -> Option<String> {
    if let Some(CommandDataOptionValue::String(value)) = get_value(self, name, CommandOptionType::String) {
      Some(value)
    } else {
      None
    }
  }

  fn get_integer(&self, name: &str) -> Option<i64> {
    if let Some(CommandDataOptionValue::Integer(value)) = get_value(self, name, CommandOptionType::Integer) {
      Some(value)
    } else {
      None
    }
  }

  fn get_bool(&self, name: &str) -> Option<bool> {
    if let Some(CommandDataOptionValue::Boolean(value)) = get_value(self, name, CommandOptionType::Boolean) {
      Some(value)
    } else {
      None
    }
  }

  fn get_user_id(&self, name: &str) -> Option<UserId> {
    if let Some(CommandDataOptionValue::User(id)) = get_value(self, name, CommandOptionType::User) {
      Some(id)
    } else {
      None
    }
  }

  fn get_channel_id(&self, name: &str) -> Option<ChannelId> {
    if let Some(CommandDataOptionValue::Channel(id)) = get_value(self, name, CommandOptionType::Channel) {
      Some(id)
    } else {
      None
    }
  }

  fn get_role_id(&self, name: &str) -> Option<RoleId> {
    if let Some(CommandDataOptionValue::Role(id)) = get_value(self, name, CommandOptionType::Role) {
      Some(id)
    } else {
      None
    }
  }

  fn get_number(&self, name: &str) -> Option<f64> {
    if let Some(CommandDataOptionValue::Number(value)) = get_value(self, name, CommandOptionType::Number) {
      Some(value)
    } else {
      None
    }
  }

  fn get_attachment(&self, name: &str) -> Option<AttachmentId> {
    if let Some(CommandDataOptionValue::Attachment(id)) = get_value(self, name, CommandOptionType::Attachment) {
      Some(id)
    } else {
      None
    }
  }
}
