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
import notFoundExternalDigestHandler from '../../src/notfoundigest/handler-external.js';
import { build404SlackMessage, getQueryParams, INITIAL_404_SLACK_MESSAGE } from '../../src/support/slack.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('not found external handler', () => {
  let context;
  const organizationData = {
    getId: () => 'org1',
    name: 'Org1',
    getConfig: () => ({
      slack: {
        workspace: 'workspace1',
        channel: 'channel1',
      },
      alerts: [{
        type: '404',
        byOrg: true,
        mentions: [{ slack: ['slackId1'] }],
      }],
    }),
  };
  const siteData = {
    getId: () => 'site1',
    getBaseURL: () => 'https://moleculardevices.com',
    getConfig: () => ({
      slack: {
        workspace: 'workspace2',
        channel: 'channel2',
      },
      alerts: [{
        type: '404',
        mentions: [{ slack: ['slackId2'] }],
      }],
    }),
  };
  const auditData = {
    state: {
      auditResult: {
        result:
          [
            {
              url: 'https://www.moleculardevices.com/sites/default/files/en/assets/training-material/dd/img',
              pageviews: '100',
              source: 'https://www.moleculardevices.com/sites/default/files/en/assets/training-material/dd/img/',
            },
          ],
        finalUrl: 'moleculardevices.com',
      },
    },
  };
  const mockDataAccess = {
    getOrganizations: sinon.stub().resolves([organizationData]),
    getSitesByOrganizationID: sinon.stub().resolves([siteData]),
    getLatestAuditForSite: sinon.stub().resolves(auditData),
  };

  beforeEach('setup', () => {
    context = {
      log: console,
      dataAccess: mockDataAccess,
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

  it('builds and sends the slack message when there is an org config and a 404 audit stored for the site', async () => {
    const backlink = 'https://main--franklin-dashboard--adobe.hlx.live/views/404-report?interval=7&offset=0&limit=100&url=www.moleculardevices.com&domainkey=scoped-domain-key';
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves(backlink),
    };
    const channel = 'channel1';
    const initialQueryParams = getQueryParams(
      [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `slackId1 ${INITIAL_404_SLACK_MESSAGE}`,
          },
        },
      ],
      channel,
    );

    nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(initialQueryParams)
      .reply(200, {
        ok: 'success',
        channel: 'channel1',
        ts: 'ts-1',
      });
    const blocks = build404SlackMessage(siteData.getBaseURL(), auditData.state.auditResult.result, backlink, ['slackId1']);
    const queryParams = getQueryParams(blocks, 'channel1', 'ts-1');
    nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(queryParams)
      .reply(200, {
        ok: 'success',
      });

    const resp = await notFoundExternalDigestHandler({}, context);
    expect(resp.status).to.equal(204);
  });

  it('builds and sends the slack message when there is an site config and a 404 audit stored for the site', async () => {
    const backlink = 'https://main--franklin-dashboard--adobe.hlx.live/views/404-report?interval=7&offset=0&limit=100&url=www.moleculardevices.com&domainkey=scoped-domain-key';
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves(backlink),
    };
    const siteContext = { ...context };
    const newOrgData = {
      ...organizationData,
      getConfig: () => ({
        alerts: [{
          type: '404',
          byOrg: false,
        }],
      }),
    };
    siteContext.dataAccess.getOrganizations = sinon.stub().resolves([newOrgData]);
    const blocks = build404SlackMessage(siteData.getBaseURL(), auditData.state.auditResult.result, backlink, ['slackId2']);
    const queryParams = getQueryParams(blocks, 'channel2');
    nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(queryParams)
      .reply(200, {
        ok: 'success',
      });

    const resp = await notFoundExternalDigestHandler({}, siteContext);
    expect(resp.status).to.equal(204);
  });

  it('returns 500 if the initial slack api fails', async () => {
    const channel = 'channel1';
    const initialQueryParams = getQueryParams(
      [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `slackId1 ${INITIAL_404_SLACK_MESSAGE}`,
          },
        },
      ],
      channel,
    );

    nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(initialQueryParams)
      .reply(400, { error: 'badrequest' });
    const resp = await notFoundExternalDigestHandler({}, context);
    expect(resp.status).to.equal(500);
  });

  it('continues if just one slack api call failed', async () => {
    const backlink = 'https://main--franklin-dashboard--adobe.hlx.live/views/404-report?interval=7&offset=0&limit=100&url=www.moleculardevices.com&domainkey=scoped-domain-key';
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves(backlink),
    };
    const siteContext = { ...context };
    const newOrgData = {
      ...organizationData,
      getConfig: () => ({
        alerts: [{
          type: '404',
          byOrg: false,
        }],
      }),
    };
    siteContext.dataAccess.getOrganizations = sinon.stub().resolves([newOrgData]);
    const blocks = build404SlackMessage(siteData.getBaseURL(), auditData.state.auditResult.result, backlink, ['slackId2']);
    const queryParams = getQueryParams(blocks, 'channel2');
    nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(queryParams)
      .reply(400, {
        error: 'error',
      });

    const resp = await notFoundExternalDigestHandler({}, siteContext);
    expect(resp.status).to.equal(204);
  });
});
