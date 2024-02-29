/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* eslint-env mocha */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { convertToCSV } from '../../src/support/utils.js';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('convertToCSV', () => {
  it('should stringify object values of the item fields in the CSV string', () => {
    const data = [
      { name: 'John', age: 23, address: { city: 'New York', zip: 10001 } },
    ];

    const csv = convertToCSV(data);

    expect(csv).to.equal('name,age,address\r\n"John","23","{"city":"New York","zip":10001}"\r\n');
  });

  it('should convert an array of objects to a CSV string', () => {
    const data = [
      { name: 'John', age: 23, city: 'New York' },
      { name: 'Jane', age: 24, city: 'San Francisco' },
    ];

    const csv = convertToCSV(data);

    expect(csv).to.equal('name,age,city\r\n"John","23","New York"\r\n"Jane","24","San Francisco"\r\n');
  });

  it('should handle empty data', () => {
    const csv = convertToCSV([]);

    expect(csv).to.equal('');
  });
});
