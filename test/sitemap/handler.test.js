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
import sitemapHandler, { buildSlackMessage, isValidMessage } from '../../src/sitemap/handler.js';

const { expect } = chai;
let message;

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
    auditResult: [
      { success: true, url: 'https://space.cat' },
      { success: false, url: 'https://www.space.cat' },
    ],
  };
});

describe('handler.js tests', () => {
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
      { value: 'value1', error: 'error1' },
      { value: 'value2', error: 'error2' },
    ];

    const result = buildSlackMessage({ url, reasons });

    expect(result).to.be.an('array');
    expect(result[0].text.text).to.equal(`Error finding sitemap for ${url}: ${reasons.map((reason) => `${reason.value} - ${reason.error}`).join(',')}`);
    expect(result[1].text.text).to.equal('Please verify and adjust the redirection settings as per your requirements. Delay in resolving this issue could result in SEO repercussions, potentially leading to a decrease in organic traffic. Prompt action is advised to mitigate this risk.');
  });

  it('sitemapHandler returns bad request when message is not valid', async () => {
    const invalidMessage = {
      url: '',
      auditContext: {},
      auditResult: [],
    };
    const context = {
      log: console,
      env: {
        SLACK_BOT_TOKEN: 'token',
      },
    };
    const resp = await sitemapHandler(invalidMessage, context);
    expect(resp.status).to.equal(400);
  });
});
