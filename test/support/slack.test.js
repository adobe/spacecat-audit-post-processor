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
/* eslint-disable no-unused-expressions */ // expect statements

import sinon from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import { getQueryParams, postSlackMessage, uploadSlackFile } from '../../src/support/slack.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('slack api', () => {
  const token = 'slack-token';
  let opts;

  beforeEach('setup', () => {
    opts = {
      blocks: ['asd', 'dsa'],
      channel: 'channel-id',
      ts: 'thread-id',
    };
  });

  afterEach('clean', () => {
    sandbox.restore();
    nock.cleanAll();
  });

  it('rejects when slack token not provided', async () => {
    await expect(postSlackMessage(null, opts)).to.be.rejectedWith('Missing slack bot token');
  });

  it('rejects when slack api returns invalid json', async () => {
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${token}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(opts.blocks, opts.channel, opts.ts))
      .reply(200, 'invalid-json');

    await expect(postSlackMessage(token, opts))
      .to.be.rejectedWith('Failed to send slack message on channel channel-id. Status: 200');
  });

  it('rejects when slack api returns error', async () => {
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${token}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(opts.blocks, opts.channel, opts.ts))
      .reply(200, '{ "ok": false, "error": "invalid_auth" }');

    await expect(postSlackMessage(token, opts))
      .to.be.rejectedWith('Slack message was not acknowledged. Error: invalid_auth');
  });

  it('returns channel-id and thread-id when message posted', async () => {
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${token}`,
      },
    })
      .get('/api/chat.postMessage')
      .query(getQueryParams(opts.blocks, opts.channel, opts.ts))
      .reply(200, `{ "ok": true, "channel": "${opts.channel}", "ts": "${opts.ts}" }`);

    const resp = await postSlackMessage(token, opts);
    expect(resp.channel).to.equal(opts.channel);
    expect(resp.ts).to.equal(opts.ts);
  });

  it('query params include thread id if defined', async () => {
    expect(getQueryParams(opts.blocks, opts.channel, null)).to.eql({
      blocks: JSON.stringify(opts.blocks),
      channel: 'channel-id',
      unfurl_links: false,
    });

    expect(getQueryParams(opts.blocks, opts.channel, opts.ts)).to.eql({
      blocks: JSON.stringify(opts.blocks),
      channel: 'channel-id',
      unfurl_links: false,
      thread_ts: opts.ts,
    });
  });

  it('uploads file to slack', async () => {
    const mockFile = new Blob(['test file content'], { type: 'text/plain' });
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${token}`,
      },
    })
      .post('/api/files.upload')
      .reply(200, {
        ok: true,
        file: {
          url_private: 'slack-file-url',
        },
      });
    const options = {
      file: mockFile,
      fileName: 'test-file.csv',
      channel: 'channel-id',
    };

    const resp = await uploadSlackFile(token, options);

    expect(resp).to.have.property('fileUrl', 'slack-file-url');
  });

  it('does not upload file to slack when token is not provided', async () => {
    await expect(uploadSlackFile(null, {})).to.be.rejectedWith('Missing slack bot token');
  });

  it('throws error when slack api request fails with non-successful status code', async () => {
    const mockFile = new Blob(['test file content'], { type: 'text/plain' });
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${token}`,
      },
    })
      .post('/api/files.upload')
      .reply(500);

    const options = {
      file: mockFile,
      fileName: 'test-file.csv',
      channel: 'channel-id',
    };

    await expect(uploadSlackFile(token, options)).to.be.rejectedWith('Failed to upload file to slack: channel channel-id, filename test-file.csv. Reason: Slack upload file API request failed. Status: 500');
  });

  it('throws error when slack api request is not acknowledged', async () => {
    const mockFile = new Blob(['test file content'], { type: 'text/plain' });
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${token}`,
      },
    })
      .post('/api/files.upload')
      .reply(200, {
        ok: false,
        error: 'some-error',
      });

    const options = {
      file: mockFile,
      fileName: 'test-file.csv',
      channel: 'channel-id',
    };

    await expect(uploadSlackFile(token, options)).to.be.rejectedWith('Slack message was not acknowledged. Error: some-error');
  });

  it('throws error when slack api returns an invalid response', async () => {
    const mockFile = new Blob(['test file content'], { type: 'text/plain' });
    nock('https://slack.com', {
      reqheaders: {
        authorization: `Bearer ${token}`,
      },
    })
      .post('/api/files.upload')
      .reply(200, 'invalid');

    const options = {
      file: mockFile,
      fileName: 'test-file.csv',
      channel: 'channel-id',
    };

    await expect(uploadSlackFile(token, options)).to.be.rejectedWith('Failed to upload file to slack: channel channel-id, filename test-file.csv. Reason: Failed to parse Slack API response. Error: SyntaxError: Unexpected token \'i\', "invalid" is not valid JSON');
  });
});
