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
import apex from '../../src/apex/handler.js';
import { allAuditsAreSuccessful, apexFails, allFails } from '../fixtures/apex-audit-results.js';
import { slackApexRequestData, slackAllFailsRequestData } from '../fixtures/slack-apex-request-data.js';
import { getQueryParams } from '../../src/support/slack.js';
import cwv from '../../src/cwv/handler.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('cwv handler', () => {
  let message;
  let context;

  beforeEach('setup', () => {
    message = {
      url: 'space.cat',
      auditContext: {
        slackContext: {
          channel: 'channel-id',
          ts: 'thread-id',
        },
      },
      auditResult: allAuditsAreSuccessful,
    };
    context = {
      log: console,
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
    const resp = await apex(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is missing', async () => {
    delete message.auditContext;
    const resp = await apex(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when audit result success is missing', async () => {
    delete message.auditResult;
    const resp = await apex(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditResult is not an array', async () => {
    message.auditResult = {};
    const resp = await cwv(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditResult is empty', async () => {
    message.auditResult = [];
    const resp = await cwv(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slack context is missing', async () => {
    delete message.auditContext.slackContext;
    const resp = await apex(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slack channel id is missing', async () => {
    delete message.auditContext.slackContext.channel;
    const resp = await apex(message, context);
    expect(resp.status).to.equal(400);
  });

  it('sends no slack message when audit was successful', async () => {
    const logSpy = sandbox.spy(context.log, 'info');

    const scope = nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(true)
      .reply(200);

    const resp = await apex(message, context);
    expect(resp.status).to.equal(204);
    expect(scope.isDone()).to.be.false; // make sure slack api is not called
    expect(logSpy).to.have.been.calledWith('Apex audit was successful for space.cat. Won\'t notify.');
  });

  it('builds and sends the slack message when non-www request failed', async () => {
    const logSpy = sandbox.spy(context.log, 'info');
    const { channel, ts } = message.auditContext.slackContext;
    message.auditResult = apexFails;

    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(slackApexRequestData, channel, ts))
      .reply(200, {
        ok: 'success',
        channel: 'ch-1',
        ts: 'ts-1',
      });

    const resp = await apex(message, context);
    expect(resp.status).to.equal(204);
    expect(logSpy).to.have.been.calledWith(`Slack notification sent for ${message.url}`);
  });

  it('builds and sends the slack message when both www and non-www requests failed', async () => {
    const logSpy = sandbox.spy(context.log, 'info');
    const { channel, ts } = message.auditContext.slackContext;
    message.auditResult = allFails;

    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(slackAllFailsRequestData, channel, ts))
      .reply(200, {
        ok: 'success',
        channel: 'ch-1',
        ts: 'ts-1',
      });

    const resp = await apex(message, context);
    expect(resp.status).to.equal(204);
    expect(logSpy).to.have.been.calledWith(`Slack notification sent for ${message.url}`);
  });

  it('sending the slack message fails', async () => {
    message.auditResult = apexFails;
    const errorLogSpy = sandbox.spy(context.log, 'error');
    const { channel, ts } = message.auditContext.slackContext;

    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(slackApexRequestData, channel, ts))
      .reply(500, 'invalid-');

    const resp = await apex(message, context);
    expect(resp.status).to.equal(500);
    expect(errorLogSpy).to.have.been.calledWith(`Failed to send Slack message for ${message.url}. Reason: Failed to send slack message. Status: 500`);
  });
});
