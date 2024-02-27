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

import chai from 'chai';
import { noContent } from '@adobe/spacecat-shared-http-utils';
import nock from 'nock';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import sitemapHandler, { buildSlackMessage, isValidMessage } from '../../src/sitemap/handler.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;
let message;
let context;

const sandbox = sinon.createSandbox();

describe('Sitemap detection audit tests', () => {
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
      auditResult:
        {
          success: true,
          url: 'https://space.cat',
        },
    };
    context = {
      log: console,
      env: {
        SLACK_BOT_TOKEN: 'token',
      },
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('isValidMessage returns true when message is valid', () => {
    expect(isValidMessage(message)).to.be.true;
  });

  it('isValidMessage returns false when url is missing', () => {
    delete message.url;
    expect(isValidMessage(message)).to.be.false;
  });

  it('buildSlackMessage should return correct blocks for given url and reasons', () => {
    const url = 'https://example.com';
    const reasons = [
      {
        value: 'value1',
        error: 'error1',
      },
      {
        value: 'value2',
        error: 'error2',
      },
    ];

    const result = buildSlackMessage({
      url,
      reasons,
    });

    expect(result)
      .to
      .be
      .an('array');
    expect(result[0].text.text)
      .to
      .equal(`Error finding sitemap for ${url}: ${reasons.map((reason) => `${reason.value} - ${reason.error}`)
        .join(',')}`);
    expect(result[1].text.text)
      .to
      .equal('Please ensure your sitemap is properly defined and accessible.');
  });

  it('sitemapHandler returns bad request when message is not valid', async () => {
    const invalidMessage = {
      url: '',
      auditContext: {},
      auditResult: [],
    };
    const resp = await sitemapHandler(invalidMessage, context);
    expect(resp.status)
      .to
      .equal(400);
  });

  it('returns no content when audit result is successful', async () => {
    const successfulMessage = {
      url: 'space.cat',
      auditContext: {
        slackContext: {
          channel: 'channel-id',
          ts: 'thread-id',
        },
      },
      auditResult: [
        {
          success: true,
          url: 'https://space.cat/sitemap.xml',
        },
      ],
    };
    const resp = await sitemapHandler(successfulMessage, context);
    expect(resp).to.contain(noContent());
  });

  it('sends no slack message when audit was successful', async () => {
    const logSpy = sandbox.spy(context.log, 'info');

    const scope = nock('https://slack.com')
      .get('/api/chat.postMessage')
      .reply(200);

    const resp = await sitemapHandler(message, context);
    expect(resp.status).to.equal(204);
    expect(scope.isDone()).to.be.false; // make sure slack api is not called
    expect(logSpy).to.have.been.calledWith('Sitemap audit was successful for space.cat. Won\'t notify.');
  });

  it('sends slack message when audit was not successful', async () => {
    const logSpy = sandbox.spy(context.log, 'info');
    const opts = message.auditContext.slackContext;

    const scope = nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query((inputData) => {
        const { blocks } = inputData;
        return blocks === '[{"type":"section","text":{"type":"mrkdwn","text":"Error finding sitemap for space.cat: https://space.cat/sitemap.xml - SITEMAP_NOT_FOUND"}},{"type":"section","text":{"type":"mrkdwn","text":"Please ensure your sitemap is properly defined and accessible."}}]';
      })
      .reply(200, `{ "ok": true, "channel": "${opts.channel}", "ts": "${opts.ts}" }`);

    const resp = await sitemapHandler({
      ...message,
      auditResult: {
        success: false,
        url: 'https://space.cat/sitemap.xml',
        reasons: [
          {
            value: 'https://space.cat/sitemap.xml',
            error: 'SITEMAP_NOT_FOUND',
          },
        ],
      },
    }, context);
    expect(resp.status).to.equal(204);
    expect(scope.isDone()).to.be.true; // make sure slack api is called
    expect(logSpy).to.have.been.calledWith('Slack notification sent for space.cat');
  });

  it('returns internal server error when sending the slack message fails', async () => {
    const errorLogSpy = sandbox.spy(context.log, 'error');
    message.auditResult = {
      success: false,
      url: 'https://space.cat/sitemap.xml',
      reasons: [
        {
          value: 'https://space.cat/sitemap.xml',
          error: 'SITEMAP_NOT_FOUND',
        },
      ],
    };

    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .get('/api/chat.postMessage')
      .query((inputData) => {
        const { blocks } = inputData;
        return blocks === '[{"type":"section","text":{"type":"mrkdwn","text":"Error finding sitemap for space.cat: https://space.cat/sitemap.xml - SITEMAP_NOT_FOUND"}},{"type":"section","text":{"type":"mrkdwn","text":"Please ensure your sitemap is properly defined and accessible."}}]';
      })
      .reply(500, 'invalid-');

    const resp = await sitemapHandler(message, context);
    expect(resp.status).to.equal(500);
    expect(errorLogSpy).to.have.been.calledWith(`Failed to send Slack message for ${message.url}. Reason: Failed to send slack message. Status: 500`);
  });
});
