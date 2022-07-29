import { Message, MessageEmbed } from 'discord.js';
import Bot from '../../bot/bot';
import Command from '../../bot/command';
import DWG from '../../utils/dwg';

interface Unit {
  readonly name: string;
  readonly aliases?: Array<string>;
}

type convertFn = (x: number) => number;

// A wrapper class for the DWG class, adapted for use with Units
class UnitStore {
  private readonly graph: DWG<Unit, convertFn>;

  constructor(input?: Array<[Unit, Array<[string, convertFn]>]>) {
    this.graph = new DWG();
    
    if (!input) return;
    
    // Add all units to the graph first
    for (const entry of input) this.graph.addVertex(entry[0]); // entry[0] has the base unit

    // Go through every connection and add as necessary
    for (const [baseUnit, destUnits] of input) {
      for (const [goalName, conversion] of destUnits) {
        const goalUnits = this.graph.find(v => [v.name, ...v.aliases].includes(goalName));
        for (const goalUnit of goalUnits) this.graph.addEdge(baseUnit, goalUnit, conversion);
      }
    }
  }

  getUnits(name: string): Array<Unit> {
    return this.graph.find(unit => {
      const searchList = [unit.name, ...unit.aliases].map(str => str.toLowerCase());
      return searchList.includes(name.toLowerCase());
    });
  }

  getConversion(unit1: Unit, unit2: Unit): convertFn {
    if (!this.graph.has(unit1) || !this.graph.has(unit2)) return;
    return this.graph.getWeight(unit1, unit2);
  }

  getNameList(): Array<string> {
    const allUnits = this.graph.getAllVertices();
    return allUnits.map(unit => unit.name);
  }
}

export default class UnitConvert extends Command {
  private readonly unitStore: UnitStore;

  constructor() {
    super(
      'unitconvert',
      'Convert a measure from one unit to another!',
      ['[value] [unit from] [unit to]', '--list'],
      { aliases: ['convert'] }
    );

    this.unitStore = new UnitStore([
      // Temperature
      [{
        name: 'Celsius',
        aliases: ['C']
      }, [
        ['F', t => t * 9 / 5 + 32],
        ['K', t => t + 272.15]
      ]],
      [{
        name: 'Fahrenheit',
        aliases: ['F']
      }, [
        ['C', t => (t - 32) * 5 / 9],
        ['K', t => (t - 32) * 5 / 9 + 273.15]
      ]],
      [{
        name: 'Kelvin',
        aliases: ['K']
      }, [
        ['C', t => t - 273.15],
        ['F', t => (t - 273.15) * 9 / 5 + 32]
      ]],
      // Length
      [{
        name: 'Meter',
        aliases: ['Meters', 'Metre', 'Metres', 'm']
      }, [
        ['km', l => l / 1000],
        ['ft', l => l / 0.3048],
        ['mi', l => l / 1609.344]
      ]],
      [{
        name: 'Kilometer',
        aliases: ['Kilometers', 'Kilometre', 'Kilometres', 'km']
      }, [
        ['m', l => l * 1000],
        ['ft', l => l / 0.0003048],
        ['mi', l => l / 1.609344]
      ]],
      [{
        name: 'Foot',
        aliases: ['Feet', 'ft']
      }, [
        ['m', l => l * 0.3048],
        ['km', l => l * 0.0003048],
        ['mi', l => l / 5280]
      ]],
      [{
        name: 'Mile',
        aliases: ['Miles', 'mi']
      }, [
        ['m', l => l * 1609.344],
        ['km', l => l * 1.609344],
        ['ft', l => l * 5280]
      ]],
      // Mass
      [{
        name: 'Kilogram',
        aliases: ['Kilograms', 'kg', 'kgs']
      }, [
        ['lb', m => m * 2.20462262],
        ['oz', m => m * 35.2739619]
      ]],
      [{
        name: 'Pound',
        aliases: ['Pounds', 'lb', 'lbs']
      }, [
        ['kg', m => m * 0.45359237],
        ['oz', m => m * 16]
      ]],
      [{
        name: 'Ounce',
        aliases: ['Ounces', 'oz']
      }, [
        ['kg', m => m * 0.02834952],
        ['lb', m => m * 0.0625]
      ]]
    ]);
  }

  async execute(message: Message, args: Array<string>, client: Bot): Promise<void> {    
    const prefix = await client.prefix(message);
    const embed = new MessageEmbed().setColor(client.config.colors.RED);

    if (args[0] === '--list') {
      const unitList = this.unitStore.getNameList();
      embed
        .setColor(client.config.colors.BLUE)
        .setTitle('Avalible units')
        .addField('Here\'s a list of all supported units.', `\`${unitList.join('\`, \`')}\``);
      message.channel.send({ embeds: [embed] });
      return;
    }

    const valueBase = args[0];
    if (!valueBase.match(/^-?\d+(\.\d+)?$/g)) {
      embed
        .setTitle('Invalid value')
        .setDescription('Unable to resolve the value.')
        .addField('Command usage', this.howTo(prefix, true));
      message.channel.send({ embeds: [embed] });
      return;
    }
    
    if (args.length !== 3) {
      embed
        .setTitle('Invalid arguments')
        .setDescription('This command takes 3 arguments.')
        .addField('Command usage', this.howTo(prefix, true));
      message.channel.send({ embeds: [embed] });
      return;
    }

    const baseUnit = this.unitStore.getUnits(args[1])[0];
    const goalUnit = this.unitStore.getUnits(args[2])[0];
    
    if (!baseUnit) {
      embed
        .setTitle('Invalid base unit')
        .setDescription('Unable to identify base unit.')
        .addField('Command usage', this.howTo(prefix, true));
      message.channel.send({ embeds: [embed] });
      return;
    }

    if (!goalUnit) {
      embed
        .setTitle('Invalid goal unit')
        .setDescription('Unable to identify goal unit.')
        .addField('Command usage', this.howTo(prefix, true));
      message.channel.send({ embeds: [embed] });
      return;
    }
      
    const conversionFn = this.unitStore.getConversion(baseUnit, goalUnit);
    const valueConverted = Math.round((conversionFn(Number(valueBase)) + Number.EPSILON) * 100) / 100;

    embed
      .setColor(client.config.colors.BLUE)
      .setTitle(`${valueBase} ${baseUnit.name} is ${valueConverted} ${goalUnit.name}`);
    message.channel.send({ embeds: [embed] });
  }
}