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
import nock from 'nock';
import experimentationHandler from '../../src/experimentation/handler.js';
import { expectedAuditResult } from '../fixtures/experimentation-data.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('experimentation handler', () => {
  let message;
  let context;
  let mockLog;
  const channel = 'channel1';
  const thread = 'thread1';

  beforeEach('setup', () => {
    message = {
      url: 'space.cat',
      auditResult: expectedAuditResult,
      auditContext: {
        slackContext: {
          channel,
          ts: 'thread-id',
        },
      },
    };

    mockLog = {
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy(),
    };

    context = {
      log: mockLog,
      env: {
        SLACK_TOKEN_WORKSPACE_INTERNAL: 'token',
        SLACK_OPS_CHANNEL_WORKSPACE_INTERNAL: 'channel-id',
      },
    };
    context.slackClients = {
      WORKSPACE_INTERNAL_STANDARD: {
        postMessage: sandbox.stub().resolves(
          { channelId: channel, threadId: thread },
        ),
        fileUpload: sandbox.stub().resolves(
          { fileUrl: 'fileurl', channels: ['channel-1', 'channel-2'] },
        ),
      },
    };
  });

  afterEach('clean', () => {
    sandbox.restore();
    nock.cleanAll();
  });

  it('rejects when url is missing', async () => {
    delete message.url;
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditResult is missing', async () => {
    delete message.auditResult;
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditResult is not an object', async () => {
    message.auditResult = 'Not an Object';
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('do not send message when no experimentation data available', async () => {
    message.auditResult = {
      result: [],
    };
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(204);
  });

  it('rejects when auditResult is not an object of objects', async () => {
    message.auditResult = {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system',
    };
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('sends a slack message when there are experimentation results', async () => {
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(204);
    expect(mockLog.info).to.have.been.calledWith('Successfully reported experiment details for space.cat');
    expect(mockLog.error).to.not.have.been.called;
  });

  it('throws error when slack api fails to upload file', async () => {
    context.slackClients.WORKSPACE_INTERNAL_STANDARD.fileUpload.rejects(new Error('error'));
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(500);
    expect(mockLog.error).to.have.been.calledOnce;
  });

  it('throws error when slack api fails to upload file', async () => {
    context.slackClients.WORKSPACE_INTERNAL_STANDARD.fileUpload.rejects(new Error('error'));
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(500);
    expect(mockLog.error).to.have.been.calledOnce;
  });
});
