import DWG from 'directed-weighted-graph';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import Bot from '../../bot/bot';
import SlashCommand from '../../bot/slashcommand';

interface Unit {
  readonly name: string;
  readonly category: string;
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
        const goalUnits = this.graph.find(v => v.name === goalName);
        for (const goalUnit of goalUnits) this.graph.addEdge(baseUnit, goalUnit, conversion);
      }
    }
  }

  getUnits(name: string): Array<Unit> {
    return this.graph.find(unit => unit.name === name);
  }

  getConversion(unit1: Unit, unit2: Unit): convertFn | null {
    if (!this.graph.hasVertex(unit1) || !this.graph.hasVertex(unit2)) return null;
    return this.graph.getWeight(unit1, unit2);
  }

  getUnitList(): Array<{ name: string, category: string }> {
    const allUnits = this.graph.getAllVertices();
    return allUnits.map(unit => {
      return { name: unit.name, category: unit.category };
    });
  }
}

export default class Units extends SlashCommand {
  private readonly unitStore: UnitStore;

  constructor(client: Bot) {
    const unitStore = new UnitStore([
      // Temperature
      [{
        name: 'Celsius',
        category: 'Temperature'
      }, [
        ['Fahrenheit', t => t * 9 / 5 + 32],
        ['Kelvin', t => t + 272.15]
      ]],
      [{
        name: 'Fahrenheit',
        category: 'Temperature'
      }, [
        ['Celsius', t => (t - 32) * 5 / 9],
        ['Kelvin', t => (t - 32) * 5 / 9 + 273.15]
      ]],
      [{
        name: 'Kelvin',
        category: 'Temperature'
      }, [
        ['Celsius', t => t - 273.15],
        ['Fahrenheit', t => (t - 273.15) * 9 / 5 + 32]
      ]],
      // Length
      [{
        name: 'Meters',
        category: 'Length'
      }, [
        ['Kilometers', l => l / 1000],
        ['Feet', l => l / 0.3048],
        ['Miles', l => l / 1609.344]
      ]],
      [{
        name: 'Kilometers',
        category: 'Length'
      }, [
        ['Meters', l => l * 1000],
        ['Feet', l => l / 0.0003048],
        ['Miles', l => l / 1.609344]
      ]],
      [{
        name: 'Feet',
        category: 'Length'
      }, [
        ['Meters', l => l * 0.3048],
        ['Kilometers', l => l * 0.0003048],
        ['Miles', l => l / 5280]
      ]],
      [{
        name: 'Miles',
        category: 'Length'
      }, [
        ['Meters', l => l * 1609.344],
        ['Kilometers', l => l * 1.609344],
        ['Feet', l => l * 5280]
      ]],
      // Mass
      [{
        name: 'Kilograms',
        category: 'Mass'
      }, [
        ['Pounds', m => m * 2.20462262],
        ['Ounces', m => m * 35.2739619]
      ]],
      [{
        name: 'Pounds',
        category: 'Mass'
      }, [
        ['Kilograms', m => m * 0.45359237],
        ['Ounces', m => m * 16]
      ]],
      [{
        name: 'Ounces',
        category: 'Mass'
      }, [
        ['Kilograms', m => m * 0.02834952],
        ['Pounds', m => m * 0.0625]
      ]],
      // Volume
      [{
        name: 'Liters',
        category: 'Volume'
      }, [
        ['Gallons', v => v * 0.264172],
        ['Fluid Ounces', v => v * 33.814]
      ]],
      [{
        name: 'Gallons',
        category: 'Volume'
      }, [
        ['Liters', v => v / 0.264172],
        ['Fluid Ounces', v => v * 128]
      ]],
      [{
        name: 'Fluid Ounces',
        category: 'Volume'
      }, [
        ['Liters', v => v * 0.0295735],
        ['Gallons', v => v * 0.0078125]
      ]]
    ]);

    const data = new SlashCommandBuilder()
      .setName('units')
      .setDescription('Unit commands')
      .addSubcommand(cmd => cmd
        .setName('list')
        .setDescription('List all supported units')
      )
      .addSubcommand(cmd => cmd
        .setName('convert')
        .setDescription('Convert a measure from one unit to another')
        .addNumberOption(option => option
          .setName('quantity')
          .setDescription('The value or amount to convert')
          .setRequired(true)
        )
        .addStringOption(option => {
          for (const unit of unitStore.getUnitList()) option.addChoices({ name: unit.name, value: unit.name });
          return option
            .setName('base')
            .setDescription('The unit to convert from')
            .setRequired(true);
        })
        .addStringOption(option => {
          for (const unit of unitStore.getUnitList()) option.addChoices({ name: unit.name, value: unit.name });
          return option
            .setName('target')
            .setDescription('The unit to convert to')
            .setRequired(true);
        })
      );
    super(data as SlashCommandBuilder, client);

    this.unitStore = unitStore;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subCommand = interaction.options.getSubcommand();
    const embed = new EmbedBuilder().setColor(this.client.config.colors.RED);

    if (subCommand === 'list') {
      // Use with .filter to filter out uniques in array
      const uniques = (value: string, index: number, list: Array<string>): boolean => list.indexOf(value) === index;
  
      const unitList = this.unitStore.getUnitList();
      const categories = unitList.map(unit => unit.category).filter(uniques);
      const fields = categories.map(category => {
        return {
          name: category,
          value: unitList.filter(unit => unit.category === category).map(unit => unit.name).join('\n')
        };
      });
      embed
        .setColor(this.client.config.colors.BLUE)
        .setTitle('Avalible units')
        .setDescription('Here\'s a list of all supported units.')
        .addFields(fields);
      interaction.reply({ embeds: [embed] });
      return;
    }

    const valueBase = interaction.options.getNumber('quantity')!;
    const baseUnit = this.unitStore.getUnits(interaction.options.getString('base')!)[0];
    const goalUnit = this.unitStore.getUnits(interaction.options.getString('target')!)[0];

    if (baseUnit.name === goalUnit.name) {
      embed.setTitle('Really?');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (baseUnit.category !== goalUnit.category) {
      embed.setTitle('Units are not of same type');
      interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
      
    const conversionFn = this.unitStore.getConversion(baseUnit, goalUnit)!;
    const valueConverted = Math.round((conversionFn(Number(valueBase)) + Number.EPSILON) * 100) / 100;

    embed
      .setColor(this.client.config.colors.BLUE)
      .setTitle(`${valueBase} ${baseUnit.name} is ${valueConverted} ${goalUnit.name}`);
    interaction.reply({ embeds: [embed] });
  }
}