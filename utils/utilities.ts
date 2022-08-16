import { GuildMember } from 'discord.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// A utility class with common functions required by some modules to run.

export default class UtilityFunctions {
  /**
   * Capitalizes the first letter of a given string.
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generator method to recursively get all files within a directory.
   */
  static async* getFiles(rootPath: string): AsyncGenerator<string> {
    const fileNames = await fs.readdir(rootPath, { withFileTypes: true });
    for (const fileName of fileNames) {
      const pathName = path.resolve(rootPath, fileName.name);
      if (fileName.isDirectory()) yield* this.getFiles(pathName);
      else yield pathName;
    }
  }

  /**
   * Compares the highest permissions of two given members.
   * @returns `true` if memberHigh is higher or equal to memberLow in the role hierarchy.
   */
  static permHierarchy(memberHigh: GuildMember, memberLow: GuildMember): boolean {
    return memberLow.roles.highest.comparePositionTo(memberHigh.roles.highest) < 1;
  }

  /**
   * Shuffles the passed array.
   */
  static shuffle<T>(array: Array<T>): Array<T> {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}