import type { IPackage } from '../typings';

export default class Package implements IPackage {
  #name: string;
  constructor(name: string) {
    this.#name = name;
  }

  get name(): string {
    return this.#name;
  }
}
