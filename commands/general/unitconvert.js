const Command = require('../../bot/command.js');
const { MessageEmbed } = require('discord.js');

class UnitConvert extends Command {
  constructor() {
    super('unitconvert', 'Convert a measure from one unit to another!', '[value] [unit from] [unit to] OR --list', { aliases: ['convert'] });
  }
  
  async execute(message, args, client) {
    // Maybe check args.length?
    
    const prefix = await client.prefix(message);
    const embed = new MessageEmbed().setColor('cc0000');

    if (args[0] == '--list') {
      const unitList = new Array();
      units.forEach(unit => unitList.push(unit.name));
      embed
        .setColor('0066cc')
        .setTitle('Avalible units')
        .addField('Here\'s a list of all supported units.', `\`${unitList.join('\`, \`')}\``);
      return message.channel.send({ embeds: [embed] });
    }

    const valueBase = args[0];
    if (!valueBase.match(/^-?\d+(\.\d+)?$/g)) {
      embed
        .setTitle('Invalid value')
        .setDescription('Unable to resolve the value.')
        .addField('Command usage', this.howTo(prefix, true));
      return message.channel.send({ embeds: [embed] });
    }
    
    if (args.length != 3) {
      embed
        .setTitle('Invalid arguments')
        .setDescription('This command takes 3 arguments.')
        .addField('Command usage', this.howTo(prefix, true));
      return message.channel.send({ embeds: [embed] });
    }

    const unitBase = args[1];
    const unitGoal = args[2];
    const baseObj = units.get(unitBase.toLowerCase());

    if (!baseObj) {
      embed
        .setTitle('Invalid base unit')
        .setDescription('Unable to identify base unit.')
        .addField('Command usage', this.howTo(prefix, true));
      return message.channel.send({ embeds: [embed] });
    }
      
    const baseName = baseObj.name;
    const goalMatches = baseObj.conversions.filter(obj => obj.unit == unitGoal.toLowerCase());
    
    if (goalMatches.length == 0) {
      embed
        .setTitle('Invalid goal unit')
        .setDescription('Unable to identify goal unit.')
        .addField('Command usage', this.howTo(prefix, true));
      return message.channel.send({ embeds: [embed] });
    }

    const goalName = goalMatches[0].name;
    const conversion = goalMatches[0].conversion;
    const valueConverted = Math.round((conversion(valueBase) + Number.EPSILON) * 100) / 100;

    embed
      .setColor('0066cc')
      .setTitle(`${valueBase} ${baseName} is ${valueConverted} ${goalName}`);
    message.channel.send({ embeds: [embed] });
  }
}

const units = new Map([
  // Temperature
  ['c', {
    name: 'Celsius',
    conversions: [
      { unit: 'f', name: 'Fahrenheit', conversion: t => t * 9 / 5 + 32 },
      { unit: 'k', name: 'Kelvin', conversion: t => Number(t) + 272.15 }
    ]
  }],
  ['f', {
    name: 'Fahrenheit',
    conversions: [
      { unit: 'c', name: 'Celsius', conversion: t => (t - 32) * 5 / 9 },
      { unit: 'k', name: 'Kelvin', conversion: t => (t - 32) * 5 / 9 + 272.15 }
    ]
  }],
  ['k', {
    name: 'Kelvin',
    conversions: [
      { unit: 'c', name: 'Celsius', conversion: t => t - 272.15 },
      { unit: 'f', name: 'Fahrenheit', conversion: t => (t - 272.15) * 9 / 5 + 32 }
    ]
  }],
  // Length
  ['m', {
    name: 'Meters',
    conversions: [
      { unit: 'km', name: 'Kilometers', conversion: l => l * 0.001 },
      { unit: 'ft', name: 'Feet', conversion: l => l / 0.3048 },
      { unit: 'mi', name: 'Miles', conversion: l => l / 1609.344 }
    ]
  }],
  ['km', {
    name: 'Kilometers',
    conversions: [
      { unit: 'm', name: 'Meters', conversion: l => l * 1000 },
      { unit: 'ft', name: 'Feet', conversion: l => l / 0.0003048 },
      { unit: 'mi', name: 'Miles', conversion: l => l / 1.609344 }
    ]
  }],
  ['ft', {
    name: 'Feet',
    conversions: [
      { unit: 'm', name: 'Meters', conversion: l => l * 0.3048 },
      { unit: 'km', name: 'Kilometers', conversion: l => l * 0.0003048 },
      { unit: 'mi', name: 'Miles', conversion: l => l / 5280 }
    ]
  }],
  ['mi', {
    name: 'Miles',
    conversions: [
      { unit: 'm', name: 'Meters', conversion: l => l * 1609.344 },
      { unit: 'km', name: 'Kilometers', conversion: l => l * 1.609344 },
      { unit: 'ft', name: 'Feet', conversion: l => l * 5280 }
    ]
  }]
]);

module.exports = UnitConvert;