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

import chai, { expect } from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import fs from 'fs';
import { context as h2 } from '@adobe/fetch';
import nock from 'nock';
import { getRecommendations } from '../../src/firefall/handler.js';

chai.use(chaiAsPromised);
global.fetch = h2;

describe('getRecommendations', () => {
  let context;
  let message;
  let audits;
  let latestAuditResult;

  beforeEach(() => {
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
      },
    };

    message = {
      type: 'message',
      url: 'https://valid.url',
      auditResult: {
        siteId: 'siteId',
      },
      auditContext: {
        slackContext: {
          channelId: 'channelId',
          threadTs: 'threadTs',
        },
      },
    };

    latestAuditResult = {
      gitHubDiff: 'GH_DIFF',
      markdownContext: {
        markdownDiff: 'MD_DIFF',
      },
      scores: {
        performance: 0.8,
        accessibility: 0.2,
        bestPractices: 0.5,
        seo: 0.5,
      },
    };

    audits = [{
      state: {
        auditedAt: new Date().toISOString(),
      },
      getAuditResult: sinon.stub(),
      getScores: sinon.stub().resolves(latestAuditResult.scores),
    }, {
      state: {
        auditedAt: new Date(0).toISOString(),
      },
      getAuditResult: sinon.stub(),
      getScores: sinon.stub().resolves({
        performance: 0.5,
        accessibility: 0.5,
        bestPractices: 0.5,
        seo: 0.5,
      }),
    }];
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should log error and return a 500 response if dataAccess object is not available from context', async () => {
    context.dataAccess = null;
    const result = await getRecommendations(message, context);
    expect(result.status).to.equal(500);
    expect(context.log.error.calledOnce).to.be.true;
    expect(context.log.error.calledWith('Data Access is not available')).to.be.true;
  });

  it('should log error and return a 404 response if audits cannot be found from provided site', async () => {
    context.dataAccess.getAuditsForSite.resolves(null);
    const result = await getRecommendations(message, context);
    expect(result.status).to.equal(404);
    expect(context.log.error.calledOnce).to.be.true;
    expect(context.log.error.calledWith(`No audits found for site ${message.auditResult.siteId}`)).to.be.true;
  });

  it('should log error and return a 404 response if audit cannot be found, but returns empty list', async () => {
    context.dataAccess.getAuditsForSite.resolves([]);
    const result = await getRecommendations(message, context);
    expect(result.status).to.equal(404);
    expect(context.log.error.calledOnce).to.be.true;
    expect(context.log.error.calledWith(`No audits found for site ${message.auditResult.siteId}`)).to.be.true;
  });

  it('should log error and return a 404 response if audit result cannot be found from provided site', async () => {
    context.dataAccess.getAuditsForSite.resolves(audits);
    const result = await getRecommendations(message, context);
    expect(result.status).to.equal(404);
    expect(context.log.error.calledOnce).to.be.true;
    expect(context.log.error.calledWith(`No audit result found for site ${message.auditResult.siteId}`)).to.be.true;
  });

  it('should log error and return a 500 response if prompt cannot be obtained', async () => {
    context.dataAccess.getAuditsForSite.resolves(audits);
    audits[0].getAuditResult.resolves(latestAuditResult);
    sinon.stub(fs, 'readFileSync').resolves(null);
    const result = await getRecommendations(message, context);
    expect(result.status).to.equal(500);
    expect(context.log.error.calledOnce).to.be.true;
    expect(context.log.error.calledWith('Prompt is not available')).to.be.true;
  });

  it('should build slack message and return a 200 response', async () => {
    context.dataAccess.getAuditsForSite.resolves(audits);
    audits[0].getAuditResult.resolves(latestAuditResult);
    sinon.stub(fs, 'readFileSync').returns('prompt');

    nock('https://slack.com')
      .get('/api/chat.postMessage?unfurl_links=false&channel=channelId&blocks=%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Insights+and+Recommendations%3A*+for+https%3A%2F%2Fvalid.url%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Score+Changes%3A*%22%7D%2C%22fields%22%3A%5B%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Performance%3A+0.5+-%3E+0.8+%3Alarge_green_circle%3A%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Accessibility%3A+0.5+-%3E+0.2+%3Awarning%3A%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22BestPractices%3A+0.5+-%3E+0.5+%3Aheavy_minus_sign%3A%22%7D%2C%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22Seo%3A+0.5+-%3E+0.5+%3Aheavy_minus_sign%3A%22%7D%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%221.+*Insight%3A*+foo+bar%5Cn*Recommendation%3A*+baz+qux%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%60%60%60foobar%60%60%60%22%7D%7D%5D&thread_ts=threadTs')
      .reply(200, {
        ok: true,
        channel: 'channelId',
        ts: 'threadTs',
      });
    sinon.stub(global, 'fetch').resolves({
      ok: true,
      json: sinon.stub().resolves({
        generations: [[{
          text: JSON.stringify({
            insights: [{
              insight: 'foo bar',
              recommendation: 'baz qux',
            }],
            code: ['foobar'],
          }),
        }]],
      }),
    });
    const result = await getRecommendations(message, context);
    expect(result.status).to.equal(200);
  });

  it('should build slack message and return a 200 response, when there are no changes detected for some properties', async () => {
    audits.pop();
    context.dataAccess.getAuditsForSite.resolves(audits);
    latestAuditResult.gitHubDiff = undefined;
    latestAuditResult.markdownContext.markdownDiff = undefined;
    latestAuditResult.scores = undefined;
    audits[0].getAuditResult.resolves(latestAuditResult);
    sinon.stub(fs, 'readFileSync').returns('prompt');

    nock('https://slack.com')
      .get('/api/chat.postMessage?unfurl_links=false&channel=channelId&blocks=%5B%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Insights+and+Recommendations%3A*+for+https%3A%2F%2Fvalid.url%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22*Score+Changes%3A*%22%7D%2C%22fields%22%3A%5B%5D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%221.+*Insight%3A*+foo+bar%5Cn*Recommendation%3A*+baz+qux%22%7D%7D%2C%7B%22type%22%3A%22section%22%2C%22text%22%3A%7B%22type%22%3A%22mrkdwn%22%2C%22text%22%3A%22%60%60%60foobar%60%60%60%22%7D%7D%5D&thread_ts=threadTs')
      .reply(200, {
        ok: true,
        channel: 'channelId',
        ts: 'threadTs',
      });
    sinon.stub(global, 'fetch').resolves({
      ok: true,
      json: sinon.stub().resolves({
        generations: [[{
          text: JSON.stringify({
            insights: [{
              insight: 'foo bar',
              recommendation: 'baz qux',
            }],
            code: ['foobar'],
          }),
        }]],
      }),
    });
    const result = await getRecommendations(message, context);
    expect(result.status).to.equal(200);
  });
});
