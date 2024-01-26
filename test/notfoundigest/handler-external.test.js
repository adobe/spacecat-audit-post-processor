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
import notFoundExternalDigestHandler from '../../src/notfoundigest/handler-external.js';
import { getQueryParams, INITIAL_404_SLACK_MESSAGE } from '../../src/support/slack.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('not found handler', () => {
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
    baseURL: 'https://moleculardevices.com',
    getConfig: () => ({
      slack: {
        workspace: 'workspace2',
        channel: 'channel2',
      },
      alerts: [{
        type: '404',
        byOrg: false,
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

  it('builds and sends the slack message when there is a 404 audit stored for the site', async () => {
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves('https://main--franklin-dashboard--adobe.hlx.live/views/404-report?interval=7&offset=0&limit=100&url=www.moleculardevices.com&domainkey=scoped-domain-key'),
    };
    const channel = 'channel-1';

    nock('https://slack.com')
      .get('/api/chat.postMessage')
      .query(getQueryParams(
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
      ))
      .reply(200, {
        ok: 'success',
        channel: 'slackId1',
        ts: 'ts-1',
      });

    const resp = await notFoundExternalDigestHandler({}, context);
    expect(resp.status).to.equal(204);
  });
});
