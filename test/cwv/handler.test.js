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
import sinon from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import { auditResultsAllAboveThreshold, auditResultsAllBelowThreshold } from '../fixtures/audit-results.js';
import cwv, { getColorEmoji } from '../../src/cwv/handler.js';
import { slackRumRequestData, slackRUMRequestDataWithoutBacklink } from '../fixtures/slack-rum-request-data.js';
import { getQueryParams } from '../../src/support/slack.js';

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
        finalUrl: 'www.space.cat',
        slackContext: {
          channel: 'channel-id',
          ts: 'thread-id',
        },
      },
      auditResult: [],
    };
    context = {
      log: console,
      env: {
        SLACK_BOT_TOKEN: 'token',
        RUM_DOMAIN_KEY: 'uber-key',
      },
    };
  });

  afterEach('clean', () => {
    sandbox.restore();
    nock.cleanAll();
  });

  it('rejects when url is missing', async () => {
    delete message.url;
    const resp = await cwv(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when finalUrl is missing', async () => {
    delete message.auditContext.finalUrl;
    const resp = await cwv(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is missing', async () => {
    delete message.auditContext;
    const resp = await cwv(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is missing', async () => {
    delete message.auditResult;
    const resp = await cwv(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is not an array', async () => {
    message.auditResult = {};
    const resp = await cwv(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slack context is missing', async () => {
    delete message.auditContext.slackContext;
    const resp = await cwv(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slack channel id is missing', async () => {
    delete message.auditContext.slackContext.channel;
    const resp = await cwv(message, context);
    expect(resp.status).to.equal(400);
  });

  it('responds with correct color emoji based on values', async () => {
    expect(getColorEmoji('unknown')).to.equal(':gray-circle:');
    const gray = [
      { lcp: [null, -1] },
      { cls: [null, -1, -0.1] },
      { inp: [null, -1] }];
    const green = [
      { lcp: [0, 2499] },
      { cls: [0, 0.0999] },
      { inp: [0, 199] }];
    const yellow = [
      { lcp: [2500, 2501, 3999] },
      { cls: [0.1, 0.2, 0.2499] },
      { inp: [200, 201, 499] }];
    const red = [
      { lcp: [4000, 4001] },
      { cls: [0.25, 0.25001] },
      { inp: [500, 5001] }];
    const expectCorrectEmoji = (data, expected) => {
      data.forEach((input) => Object.keys(input).forEach((type) => {
        input[type].forEach((value) => expect(getColorEmoji(type, value)).to.equal(expected));
      }));
    };
    expectCorrectEmoji(gray, ':gray-circle:');
    expectCorrectEmoji(green, ':green:');
    expectCorrectEmoji(yellow, ':yellow:');
    expectCorrectEmoji(red, ':red:');
  });

  it('sends no slack message when audit results are empty', async () => {
    const logSpy = sandbox.spy(context.log, 'info');

    const scope = nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(true)
      .reply(200);

    const resp = await cwv(message, context);
    expect(resp.status).to.equal(204);
    expect(scope.isDone()).to.be.false; // make sure slack api is not called
    expect(logSpy).to.have.been.calledWith('All CWV values are below threshold for space.cat');
  });

  it('sends no slack message when all audit results are below threshold', async () => {
    message.auditResult = auditResultsAllBelowThreshold;
    const logSpy = sandbox.spy(context.log, 'info');

    const scope = nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(true)
      .reply(200);

    const resp = await cwv(message, context);
    expect(resp.status).to.equal(204);
    expect(scope.isDone()).to.be.false; // make sure slack api is not called
    expect(logSpy).to.have.been.calledWith('All CWV values are below threshold for space.cat');
  });

  it('builds and sends the slack message when audit result contains values above threshold', async () => {
    message.auditResult = auditResultsAllAboveThreshold;
    context.rumApiClient = {
      createRUMBacklink: sandbox.stub().resolves('https://main--franklin-dashboard--adobe.hlx.live/views/rum-dashboard?interval=7&offset=0&limit=100&url=www.space.cat&domainkey=scoped-domain-key'),
    };
    const logSpy = sandbox.spy(context.log, 'info');
    const { channel, ts } = message.auditContext.slackContext;

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

    const resp = await cwv(message, context);
    expect(resp.status).to.equal(204);
    expect(logSpy).to.have.been.calledWith(`Slack notification sent for ${message.url}`);
  });

  it('builds and sends the slack message without backlink when no backlink generated', async () => {
    message.auditResult = auditResultsAllAboveThreshold;
    context.rumApiClient = {
      createRUMBacklink: sandbox.stub().rejects('I don\'t feel like generating a backlink today'),
    };
    const infoLogSpy = sandbox.spy(context.log, 'info');
    const warnLogSpy = sandbox.spy(context.log, 'warn');
    const { channel, ts } = message.auditContext.slackContext;

    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(slackRUMRequestDataWithoutBacklink, channel, ts))
      .reply(200, {
        ok: 'success',
        channel: 'ch-1',
        ts: 'ts-1',
      });

    const resp = await cwv(message, context);
    expect(resp.status).to.equal(204);
    expect(warnLogSpy).to.have.been.calledWith(`Failed to get a backlink for ${message.auditContext.finalUrl}`);
    expect(infoLogSpy).to.have.been.calledWith(`Slack notification sent for ${message.url}`);
  });

  it('sending the slack message fails', async () => {
    message.auditResult = auditResultsAllAboveThreshold;
    context.rumApiClient = {
      createRUMBacklink: sandbox.stub().rejects('I don\'t feel like generating a backlink today'),
    };
    const warnLogSpy = sandbox.spy(context.log, 'warn');
    const errorLogSpy = sandbox.spy(context.log, 'error');
    const { channel, ts } = message.auditContext.slackContext;

    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(slackRUMRequestDataWithoutBacklink, channel, ts))
      .reply(500, 'invalid-');

    const resp = await cwv(message, context);
    expect(resp.status).to.equal(500);
    expect(warnLogSpy).to.have.been.calledWith(`Failed to get a backlink for ${message.auditContext.finalUrl}`);
    expect(errorLogSpy).to.have.been.calledWith(`Failed to send Slack message for ${message.url}. Reason: Failed to send slack message on channel ${channel}. Status: 500`);
  });
});
