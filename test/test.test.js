/*
 * Copyright 2023 Adobe. All rights reserved.
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

const { expect } = chai;
chai.use(chaiAsPromised);

// A simple async function that always resolves
async function alwaysResolves() {
  return Promise.resolve('success');
}

// Mocha test suite
describe('alwaysResolves function', () => {
  it('should always resolve successfully', () =>
    // Test that the function always resolves
    // eslint-disable-next-line implicit-arrow-linebreak
    expect(alwaysResolves()).to.eventually.be.fulfilled);
});
