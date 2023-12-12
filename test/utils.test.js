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
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import fs from 'fs';
import { getPrompt } from '../src/support/utils.js';

const { expect } = chai;
chai.use(chaiAsPromised);

describe('Utils functions', () => {
  let readFileSyncStub;
  let logStub;

  beforeEach(() => {
    readFileSyncStub = sinon.stub(fs, 'readFileSync');
    logStub = {
      error: sinon.stub(console, 'error'),
    };
  });

  afterEach(() => {
    readFileSyncStub.restore();
    logStub.error.restore();
  });

  it('should return the content of a prompt file', async () => {
    const testPlaceholder = 'TEST_CODE_DIFF';
    readFileSyncStub.returns('Testing placeholders: {{testPlaceholder}}');

    const placeholders = {
      testPlaceholder,
    };

    const prompt = await getPrompt(placeholders);
    expect(prompt).to.equal(`Testing placeholders: ${testPlaceholder}`);
  });

  it('should return the content of a prompt file and ignore not existing placeholders', async () => {
    readFileSyncStub.returns('Testing placeholders: {{notExisting}}');

    const placeholders = {};

    const prompt = await getPrompt(placeholders);
    expect(prompt).to.equal('Testing placeholders: {{notExisting}}');
  });

  it('should log an error and return null if reading of the prompt file fails', async () => {
    const fsError = new Error('Test Failure');
    readFileSyncStub.throws(fsError);
    const prompt = await getPrompt({}, logStub);
    expect(prompt).to.be.null;
    expect(logStub.error.calledWith('Error reading prompt file:', fsError.message)).to.be.true;
  });
});
