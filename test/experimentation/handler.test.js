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
import { getQueryParams } from '../../src/support/slack.js';
import { slackRumRequestData } from '../fixtures/slack-experimentation-request-data.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('experimentation handler', () => {
  let message;
  let context;
  let mockLog;

  beforeEach('setup', () => {
    message = {
      url: 'space.cat',
      auditContext: {
        finalUrl: 'www.space.cat',
        slackContext: {
          channel: 'channel-id',
          ts: 'thread-id',
        },
      },
      auditResult: expectedAuditResult,
    };

    mockLog = {
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy(),
    };

    context = {
      log: mockLog,
      env: {
        SLACK_BOT_TOKEN: 'token',
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

  it('rejects when auditResult is not an object of objects', async () => {
    message.auditResult = {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system',
    };
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is missing', async () => {
    delete message.auditContext;
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slackContext is missing in auditContext', async () => {
    delete message.auditContext.slackContext;
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('throws error when slack api fails to upload file', async () => {
    const { channel, ts } = message.auditContext.slackContext;
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .post('/api/files.upload')
      .times(1)
      .reply(500);
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(slackRumRequestData, channel, ts))
      .reply(200, {
        ok: 'success',
        channel: 'ch-1',
        ts: 'ts-1',
      });
    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(204);
    expect(mockLog.error).to.have.been.calledOnce;
  });

  it('sends a slack message when there are experiment results', async () => {
    const { channel, ts } = message.auditContext.slackContext;
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .post('/api/files.upload')
      .times(1)
      .reply(200, {
        ok: true,
        file: {
          url_private: 'slack-file-url',
        },
      });

    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(slackRumRequestData, channel, ts))
      .reply(200, {
        ok: 'success',
        channel: 'ch-1',
        ts: 'ts-1',
      });

    const resp = await experimentationHandler(message, context);
    expect(resp.status).to.equal(204);
    expect(mockLog.error).to.not.have.been.called;
  });
});
