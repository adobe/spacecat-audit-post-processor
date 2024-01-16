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

  beforeEach('setup', () => {
    message = {
      url: 'space.cat',
      auditContext: {
        slackContext: {
          channel: 'channel-id',
          ts: 'thread-id',
        },
      },
      auditResult: {
        brokenBacklinks: [
          {
            title: 'backlink title',
            url_from: 'url-from',
            languages: [
              'en',
            ],
            domain_rating_source: 57,
            url_rating_source: 1.3,
            traffic_domain: 37326,
            refdomains_source: 1,
            linked_domains_source_page: 12,
            links_external: 16,
            traffic: 0,
            positions: 5,
            name_target: 'name-target',
            http_code_target: 404,
            snippet_left: 'snippet-left',
            anchor: 'anchor',
            snippet_right: 'snippet-right',
            link_type: 'text',
            is_content: true,
            is_dofollow: true,
            is_ugc: false,
            is_sponsored: false,
            link_group_count: 1,
          },
          {
            title: 'backlink title 2',
            url_from: 'url-from-2',
            languages: [
              'en',
            ],
            domain_rating_source: 49,
            url_rating_source: 3.3,
            traffic_domain: 12819,
            refdomains_source: 0,
            linked_domains_source_page: 6,
            links_external: 7,
            traffic: 0,
            positions: 0,
            name_target: 'name-target-2',
            http_code_target: 404,
            snippet_left: 'snippet-left-2',
            anchor: 'anchor-2',
            snippet_right: 'snippet-right-2',
            link_type: 'text',
            is_content: true,
            is_dofollow: true,
            is_ugc: false,
            is_sponsored: false,
            link_group_count: 1,
          },
        ],
      },
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
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when auditResult is missing', async () => {
    delete message.auditResult;
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(400);
  });

  it('rejects when backlinks are missing in auditResult', async () => {
    delete message.auditResult.brokenBacklinks;
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
    message.auditResult.brokenBacklinks = [];
    const resp = await brokenBacklinksHandler(message, context);
    expect(resp.status).to.equal(204);
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
    expect(resp.status).to.equal(500);
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
});
