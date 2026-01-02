/* eslint-disable no-magic-numbers */

import { expect, test } from 'vitest';

const app = (number1: number, number2: number): number => number1 + number2;

test('Test must be passed', () => {
  expect(app(1, 2)).toBe(3);
});
