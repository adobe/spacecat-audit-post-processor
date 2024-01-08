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
import fs from 'fs';
import { context as h2 } from '@adobe/fetch';
import nock from 'nock';
import lhs from '../../src/lhs/handler.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
global.fetch = h2;
const { expect } = chai;

describe('lhs handler', () => {
  let context;
  let message;
  let readFileSyncStub;

  const mockFirefall = () => {
    nock(context.env.FIREFALL_API_ENDPOINT)
      .post('/')
      .reply(200, {
        ok: true,
        json: sinon.stub().resolves({
          generations: [
            [{
              text: 'Testing placeholders: {{testPlaceholder}}',
            }],
          ],
        }),
      });
  };

  beforeEach(() => {
    readFileSyncStub = sinon.stub(fs, 'readFileSync');
    readFileSyncStub.returns('Testing placeholders: {{testPlaceholder}}');

    context = {
      dataAccess: {
        getAuditsForSite: sinon.stub(),
      },
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        error: sinon.stub(),
      },
      env: {
        FIREFALL_API_ENDPOINT: 'https://valid.url',
        FIREFALL_IMS_ORG: 'org',
        FIREFALL_API_KEY: 'key',
        FIREFALL_API_AUTH: 'auth',
        SLACK_BOT_TOKEN: 'token',
        FIREFALL_INTEGRATION_ENABLED: 'true',
      },
    };

    message = {
      type: 'message',
      url: 'https://valid.url',
      auditResult: {
        siteId: 'siteId',
        scores: {
          performance: 0.8,
          seo: 0.78,
          accessibility: 0.96,
          'best-practices': 0.94,
        },
      },
      auditContext: {
        slackContext: {
          channel: 'channelId',
          ts: 'threadTs',
        },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
    readFileSyncStub.restore();
    nock.cleanAll();
  });

  it('rejects when url is missing', async () => {
    delete message.url;
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is missing', async () => {
    delete message.auditContext;
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditResult is missing', async () => {
    delete message.auditResult;
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when siteId is missing', async () => {
    delete message.auditResult.siteId;
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when scores are missing', async () => {
    delete message.auditResult.scores;
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when scores is not an object', async () => {
    message.auditResult.scores = 'not an object';
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slack context is missing', async () => {
    delete message.auditContext.slackContext;
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slack channel is missing', async () => {
    delete message.auditContext.slackContext.channel;
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(400);
  });

  it('sends no slack message when LHS values are below threshold', async () => {
    message.auditResult.scores = {
      performance: 0.9,
      seo: 0.99,
      accessibility: 0.96,
      'best-practices': 0.94,
    };
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(204);
    expect(context.log.info).to.have.been.calledWith(`All LHS values from ${message.url} are above 90, not posting to Slack`);
  });

  it('sends no slack message when firefall integration is disabled', async () => {
    context.env.FIREFALL_INTEGRATION_ENABLED = 'false';
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(204);
    expect(context.log.info).to.have.been.calledWith('Firefall integration disabled, skipping message', message);
  });

  it('rejects with error if firefall prompt is not available', async () => {
    readFileSyncStub.returns(null);
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(500);
    expect(context.log.error).to.have.been.calledWith('Prompt is not available');
  });

  it('rejects with error if slack message could not be sent', async () => {
    mockFirefall();
    nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(true)
      .reply(500);
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(500);
    expect(context.log.error).to.be.calledWith(`Failed to send Slack message for ${message.url}. Reason: Failed to send slack message. Status: 500`);
  });

  it('sends slack message with data from firefall', async () => {
    mockFirefall();
    nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(true)
      .reply(200, {
        ok: 'success',
        channel: 'ch-1',
        ts: 'ts-1',
      });
    const resp = await lhs(message, context);
    expect(resp.status).to.equal(204);
    expect(context.log.info).to.be.calledWith(`Slack notification sent for ${message.url} to ${message.auditContext.slackContext.channel} in thread ${message.auditContext.slackContext.ts}`);
  });
});
