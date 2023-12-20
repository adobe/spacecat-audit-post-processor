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
import { buildSlackMessage, getLHSData } from '../../src/lhs/firefall-utils.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

describe('getLHSData', () => {
  let type;
  let site;
  let finalUrl;
  let dataAccess;
  let log;
  let latestAuditResult;
  let audits;

  beforeEach(() => {
    type = 'lhs';
    finalUrl = 'https://example.com';
    site = {
      siteId: 'siteId',
      url: 'https://valid.url',
    };
    dataAccess = {
      getAuditsForSite: sinon.stub(),
    };
    log = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub(),
    };

    latestAuditResult = {
      gitHubDiff: 'GH_DIFF',
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
    nock.cleanAll();
  });

  it('should log error and return a 500 response if dataAccess object is not available from context', async () => {
    dataAccess = null;
    const data = await getLHSData(type, site, finalUrl, dataAccess, log);
    expect(data.status).to.equal(500);
    expect(log.error).to.be.calledWith('Data Access is not available');
  });

  it('should log error and return a 404 response if audits cannot be found from provided site', async () => {
    dataAccess.getAuditsForSite.resolves(null);
    const data = await getLHSData(type, site, finalUrl, dataAccess, log);
    expect(data.status).to.equal(404);
    expect(log.error).to.be.calledWith(`No audits found for site ${site.siteId}`);
  });

  it('should log error and return a 404 response if audit cannot be found, but returns empty list', async () => {
    dataAccess.getAuditsForSite.resolves([]);
    const data = await getLHSData(type, site, finalUrl, dataAccess, log);
    expect(data.status).to.equal(404);
    expect(log.error).to.be.calledWith(`No audits found for site ${site.siteId}`);
  });

  it('should log error and return a 404 response if audit result cannot be found from provided site', async () => {
    dataAccess.getAuditsForSite.resolves(audits);
    const data = await getLHSData(type, site, finalUrl, dataAccess, log);
    expect(data.status).to.equal(404);
    expect(log.error).to.be.calledWith(`No audit result found for site ${site.siteId}`);
  });

  it('should return lhs scores and diffs', async () => {
    dataAccess.getAuditsForSite.resolves(audits);
    audits[0].getAuditResult.resolves(latestAuditResult);
    const markdownContentStub = 'Sample Markdown content';
    nock('https://example.com')
      .get('/index.md')
      .reply(200, markdownContentStub);
    const data = await getLHSData(type, site, finalUrl, dataAccess, log);
    expect(data).to.deep.equal({
      codeDiff: latestAuditResult.gitHubDiff,
      mdContent: markdownContentStub,
      scoreBefore: await audits[1].getScores(),
      scoreAfter: latestAuditResult.scores,
    });
  });
});

describe('buildSlackMessage', () => {
  let url;
  let data;
  let lhsData;

  const titleSection = {
    text: {
      text: '*Insights and Recommendations:* for https://example.com',
      type: 'mrkdwn',
    },
    type: 'section',
  };

  const insightSection = {
    text: {
      text: '1. *Insight:* insight\n*Recommendation:* recommendation',
      type: 'mrkdwn',
    },
    type: 'section',
  };

  const codeSection = {
    text: {
      text: '```code```',
      type: 'mrkdwn',
    },
    type: 'section',
  };

  beforeEach(() => {
    url = 'https://example.com';
    data = {
      insights: [
        {
          insight: 'insight',
          recommendation: 'recommendation',
        },
      ],
      code: [
        'code',
      ],
    };
    lhsData = {
      codeDiff: 'GH_DIFF',
      mdContent: 'MD_CONTENT',
      scoreBefore: {
        performance: 0.5,
        accessibility: 0.5,
        bestPractices: 0.5,
        seo: 0.5,
      },
      scoreAfter: {
        performance: 0.8,
        accessibility: 0.2,
        bestPractices: 0.5,
        seo: 0.5,
      },
    };
  });

  it('should handle scoresBefore not available', () => {
    delete lhsData.scoreBefore;
    const message = buildSlackMessage(url, data, lhsData);
    expect(message).to.deep.equal([
      titleSection,
      insightSection,
      codeSection,
    ]);
  });

  it('should handle scoresAfter not available', () => {
    delete lhsData.scoreAfter;
    const message = buildSlackMessage(url, data, lhsData);
    expect(message).to.deep.equal([
      titleSection,
      insightSection,
      codeSection,
    ]);
  });

  it('should handle insights not available', () => {
    delete data.insights;
    const message = buildSlackMessage(url, data, lhsData);
    expect(message).to.deep.equal([
      titleSection,
      codeSection,
    ]);
  });

  it('should handle code not available', () => {
    delete data.code;
    const message = buildSlackMessage(url, data, lhsData);
    expect(message).to.deep.equal([
      titleSection,
      insightSection,
    ]);
  });
});
