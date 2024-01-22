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
import brokenBacklinksHandler from '../../src/backlinks/handler.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('backlinks handler', () => {
  let message;
  let context;
  let mockLog;

  beforeEach('setup', () => {
    message = {
      url: 'space.cat',
      auditContext: {
        slackContext: {
          channel: 'channel-id',
          ts: 'thread-id',
        },
      },
      auditResult: [
        {
          url: 'space.cat',
          brokenBacklinks: [
            {
              title: 'backlink title',
              url_from: 'url-from',
              url_to: 'url-to',
              languages: ['en'],
            },
            {
              title: 'backlink title 2',
              url_from: 'url-from-2',
              url_to: 'url-to-2',
              languages: ['en'],
            },
          ],
        },
        {
          url: 'www.space.cat',
          brokenBacklinks: [
            {
              title: 'backlink title',
              url_from: 'url-from',
              url_to: 'url-to',
              languages: ['en'],
            },
            {
              title: 'backlink title 2',
              url_from: 'url-from-2',
              url_to: 'url-to-2',
              languages: ['en'],
            },
          ],
        },
      ],
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
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditResult is missing', async () => {
    delete message.auditResult;
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditResult is not an array', async () => {
    message.auditResult = {};
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditContext is missing', async () => {
    delete message.auditContext;
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when slackContext is missing in auditContext', async () => {
    delete message.auditContext.slackContext;
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('sends no slack message when there are no broken backlinks', async () => {
    message.auditResult = [{
      url: message.url,
      brokenBacklinks: [],
    }];
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(204);
    expect(mockLog.info).to.have.been.calledWith(`No broken backlinks detected for ${message.url}`);
  });

  it('throws error when slack api fails to upload file', async () => {
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .post('/api/files.upload')
      .reply(500);
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(204);
    expect(mockLog.error).to.have.been.calledWith(`Failed to send slack message to report broken backlinks for ${message.url}. Reason: Failed to upload file to slack. Reason: Slack upload file API request failed. Status: 500`);
  });

  it('sends a slack message when there are broken backlinks', async () => {
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .post('/api/files.upload')
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
      .query(true)
      .reply(200, '{ "ok": true, "channel": "channel-id", "ts": "thread-id" }');
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(204);
  });

  it('sends a slack message when there are broken backlinks and an url with protocol', async () => {
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${context.env.SLACK_BOT_TOKEN}`,
      },
    })
      .post('/api/files.upload')
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
      .query(true)
      .reply(200, '{ "ok": true, "channel": "channel-id", "ts": "thread-id" }');
    const resp = await brokenBacklinksHandler(message = {
      url: 'https://space.cat/test',
      auditContext: {
        slackContext: {
          channel: 'channel-id',
          ts: 'thread-id',
        },
      },
      auditResult: [{
        url: 'https://space.cat/test',
        brokenBacklinks: [
          {
            title: 'backlink title',
            url_from: 'url-from',
            url_to: 'url-to',
          },
          {
            title: 'backlink title 2',
            url_from: 'url-from-2',
            url_to: 'url-to-2',
          },
        ],
      }],
    }, context);
    expect(resp.status).to.equal(204);
  });
});
