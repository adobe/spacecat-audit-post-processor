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

import sinon from 'sinon';
import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import noopHandler from '../../src/digest/handler-noop.js';

use(sinonChai);
use(chaiAsPromised);

const sandbox = sinon.createSandbox();

describe('noop handler', () => {
  let message;
  let context;
  let mockLog;

  beforeEach('setup', () => {
    message = {
      url: 'space.cat',
      type: 'some-type',
    };
    mockLog = {
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy(),
    };
    context = {
      log: mockLog,
    };
  });

  afterEach('clean', () => {
    sandbox.restore();
  });

  it('executes noop and just logs alert report type and url', async () => {
    const resp = await noopHandler(message, context);

    expect(resp.status).to.equal(204);

    expect(mockLog.info).to.have.been.calledWith(`Alert report of type ${message.type} received for: ${message.url}`);
  });
});
