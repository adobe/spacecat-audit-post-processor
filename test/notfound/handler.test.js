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
import { notFoundSourcesResults } from '../fixtures/notfound-sources-results.js';
import {
  slack404RequestData,
  slack404RequestDataWithoutBacklink,
} from '../fixtures/slack-404-request-data.js';
import notFound from '../../src/notfound/handler.js';
import { getQueryParams } from '../../src/support/slack.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('not found handler', () => {
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
    const resp = await notFound(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when finalUrl is missing', async () => {
    delete message.auditContext.finalUrl;
    const resp = await notFound(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is missing', async () => {
    delete message.auditContext;
    const resp = await notFound(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is missing', async () => {
    delete message.auditResult;
    const resp = await notFound(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is not an array', async () => {
    message.auditResult = {};
    const resp = await notFound(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slack context is missing', async () => {
    delete message.auditContext.slackContext;
    const resp = await notFound(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slack channel id is missing', async () => {
    delete message.auditContext.slackContext.channel;
    const resp = await notFound(message, context);
    expect(resp.status).to.equal(400);
  });

  it('sends no slack message when audit results are empty', async () => {
    const logSpy = sandbox.spy(context.log, 'info');

    const scope = nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(true)
      .reply(200);

    const resp = await notFound(message, context);
    expect(resp.status).to.equal(204);
    expect(scope.isDone()).to.be.false; // make sure slack api is not called
    expect(logSpy).to.have.been.calledWith('There are no 404 results for space.cat');
  });

  it('builds and sends the slack message when audit result contains values above threshold', async () => {
    message.auditResult = notFoundSourcesResults;
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves('https://main--franklin-dashboard--adobe.hlx.live/views/404-report?interval=7&offset=0&limit=100&url=www.space.cat&domainkey=scoped-domain-key'),
    };
    const logSpy = sandbox.spy(context.log, 'info');
    const { channel, ts } = message.auditContext.slackContext;

    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(slack404RequestData, channel, ts))
      .reply(200, {
        ok: 'success',
        channel: 'ch-1',
        ts: 'ts-1',
      });

    const resp = await notFound(message, context);
    expect(resp.status).to.equal(204);
    expect(logSpy).to.have.been.calledWith(`Slack notification sent for ${message.url}`);
  });

  it('builds and sends the slack message without backlink when no backlink generated', async () => {
    message.auditResult = notFoundSourcesResults;
    context.rumApiClient = {
      create404Backlink: sandbox.stub().rejects('I don\'t feel like generating a backlink today'),
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
      .query(getQueryParams(slack404RequestDataWithoutBacklink, channel, ts))
      .reply(200, {
        ok: 'success',
        channel: 'ch-1',
        ts: 'ts-1',
      });

    const resp = await notFound(message, context);
    expect(resp.status).to.equal(204);
    expect(warnLogSpy).to.have.been.calledWith(`Failed to get a backlink for ${message.auditContext.finalUrl}`);
    expect(infoLogSpy).to.have.been.calledWith(`Slack notification sent for ${message.url}`);
  });

  it('sending the slack message fails', async () => {
    message.auditResult = notFoundSourcesResults;
    context.rumApiClient = {
      create404Backlink: sandbox.stub().rejects('I don\'t feel like generating a backlink today'),
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
      .query(getQueryParams(slack404RequestData, channel, ts))
      .reply(500, 'invalid-');

    const resp = await notFound(message, context);
    expect(resp.status).to.equal(500);
    expect(warnLogSpy).to.have.been.calledWith(`Failed to get a backlink for ${message.auditContext.finalUrl}`);
    expect(errorLogSpy).to.have.been.calledWith(`Failed to send Slack message for ${message.url}. Reason: Failed to send slack message. Status: 500`);
  });
});
