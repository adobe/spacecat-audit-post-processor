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
import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import lhsHandler from '../../src/lhs/handler.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('experimentation handler', () => {
  let message;
  let badMessage;
  let context;

  beforeEach('setup', () => {
    message = {
      url: 'go.anixter.com',
      auditContext: {
        fullAuditRef: 'https://psi.experiencecloud.live/?taskId=07d22dc0-ee3b-11ee-aada-b7cc5d29beb9',
      },
    };

    context = {
      log: {
        info: (msg) => msg,
      },
    };

    badMessage = {
      url: 'go.anixter.com',
      auditContext: {
        fullAuditRef: null,
      },
    };
  });

  afterEach('clean', () => {
    sandbox.restore();
  });

  it('successful run returns proper status', async () => {
    const resp = await lhsHandler(message, context);
    expect(resp.status).to.equal(204);
  }).timeout(5000);

  it('handler fails with missing audit reference link and returns proper status', async () => {
    const resp = await lhsHandler(badMessage, context);
    expect(resp.status).to.equal(400);
  }).timeout(5000);
});
