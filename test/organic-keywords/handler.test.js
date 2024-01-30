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
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import nock from 'nock';
import organicKeywordsHandler from '../../src/organic-keywords/handler.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('Organic Keywords Tests', () => {
  let message;
  let context;

  beforeEach('setup', () => {
    message = {
      url: 'https://foobar.com',
      auditResult: {
        keywords: [
          {
            keyword: 'foo',
            sum_traffic: 123,
            best_position: 1,
            best_position_prev: 1,
            best_position_diff: 0,
          },
          {
            keyword: 'bar',
            sum_traffic: 23,
            best_position: 2,
            best_position_prev: 7,
            best_position_diff: -5,
          },
          {
            keyword: 'bax',
            sum_traffic: 3,
            best_position: 8,
            best_position_prev: 5,
            best_position_diff: 3,
          },
        ],
      },
      auditContext: {
        slackContext: {
          channel: 'channel-id',
          ts: 'thread-id',
        },
      },
    };

    context = {
      log: {
        info: sandbox.spy(),
        warn: sandbox.spy(),
        error: sandbox.spy(),
      },
      env: {
        SLACK_BOT_TOKEN: 'token',
      },
    };
  });

  afterEach('clean', () => {
    sandbox.restore();
    nock.cleanAll();
  });

  it('should return 400 if message is missing url', async () => {
    delete message.url;
    const result = await organicKeywordsHandler(message, context);
    expect(result.status).to.equal(400);
  });

  it('should return 400 if message is missing auditResult', async () => {
    delete message.auditResult;
    const result = await organicKeywordsHandler(message, context);
    expect(result.status).to.equal(400);
  });

  it('should return 400 if message is missing auditContext', async () => {
    delete message.auditContext;
    const result = await organicKeywordsHandler(message, context);
    expect(result.status).to.equal(400);
  });

  it('should return 400 if message is missing slackContext', async () => {
    delete message.auditContext.slackContext;
    const result = await organicKeywordsHandler(message, context);
    expect(result.status).to.equal(400);
  });

  it('should return 204 if audit result does not have a keyword property', async () => {
    delete message.auditResult.keywords;
    const result = await organicKeywordsHandler(message, context);
    expect(result.status).to.equal(204);
    expect(context.log.info).to.have.been.calledWith('https://foobar.com does not have any organic keywords.');
  });

  it('should return 204 if there are no keywords in the audit result', async () => {
    message.auditResult.keywords = [];
    const result = await organicKeywordsHandler(message, context);
    expect(result.status).to.equal(204);
    expect(context.log.info).to.have.been.calledWith('https://foobar.com does not have any organic keywords.');
  });

  it('logs error when slack api fails to upload file', async () => {
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .post('/api/files.upload')
      .times(1)
      .reply(500);

    const result = await organicKeywordsHandler(message, context);
    expect(result.status).to.equal(204);
    expect(context.log.error).to.have.been.calledWith('Failed to send slack message to report organic keywords for https://foobar.com: '
      + 'Failed to upload file to slack. Reason: Slack upload file API request failed. Status: 500');
  });

  it('should send slack message with keywords', async () => {
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

    const result = await organicKeywordsHandler(message, context);
    expect(result.status).to.equal(204);
    expect(context.log.error).to.not.have.been.called;
  });
});
