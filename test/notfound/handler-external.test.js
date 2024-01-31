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
import notFoundExternalDigestHandler from '../../src/notfound/handler-external.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('not found external handler', () => {
  let context;
  const backlink = 'https://main--franklin-dashboard--adobe.hlx.live/views/404-report?interval=7&offset=0&limit=100&url=www.abcd.com&domainkey=scoped-domain-key';
  const auditData = {
    state: {
      auditResult: {
        result:
            [
              {
                url: 'https://www.abcd.com/sites/default/files/en/assets/training-material/dd/img',
                pageviews: '100',
                source: 'https://www.abcd.com/sites/default/files/en/assets/training-material/dd/img/',
              },
            ],
        finalUrl: 'abcd.com',
      },
    },
  };
  auditData.getAuditResult = () => auditData.state.auditResult;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  auditData.getAuditedAt = () => yesterday.toISOString();
  const organizationData1 = {
    getId: () => 'org1',
    name: 'Org1',
    getConfig: () => ({
      slack: {
        workspace: 'workspace',
        channel: 'channelOrg1',
      },
      alerts: [{
        type: '404',
        byOrg: true,
        mentions: [{ slack: ['slackOrgId1'] }],
      }],
    }),
  };
  const siteData1 = {
    getId: () => 'site1',
    getBaseURL: () => 'https://abcd.com',
    getConfig: () => ({
      slack: {
        workspace: 'workspace',
        channel: 'channelSite1',
      },
      alerts: [{
        type: '404',
        mentions: [{ slack: ['slackSiteId1'] }],
      }],
    }),
    getAudits: () => [auditData],
  };
  const mockDataAccess = {
    getOrganizations: sinon.stub().resolves([organizationData1, { getId: () => 'default', getConfig: () => {} }]),
    getSitesByOrganizationIDWithLatestAudits: sinon.stub().resolves([siteData1]),
    getLatestAuditForSite: sinon.stub().resolves(auditData),
  };

  beforeEach('setup', () => {
    context = {
      log: console,
      dataAccess: mockDataAccess,
      env: {
        RUM_DOMAIN_KEY: 'uber-key',
      },
    };
  });

  afterEach('clean', () => {
    sandbox.restore();
  });

  it('builds and sends the slack message when there is an org config and a 404 audit stored for the site', async () => {
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves(backlink),
    };
    const channel = 'channel1';
    context.slackClients = {
      ADOBE_EXTERNAL: { postMessage: sandbox.stub().resolves({ channelId: channel, threadId: 'ts-1' }) },
    };
    const resp = await notFoundExternalDigestHandler(context);
    expect(resp.status).to.equal(204);
  });

  it('builds no message when there is no audit', async () => {
    context.slackClients = {
      ADOBE_EXTERNAL: { postMessage: sandbox.stub().rejects(new Error('error')) },
    };
    const noAuditContext = { ...context };
    noAuditContext.dataAccess = { ...context.dataAccess };
    noAuditContext.dataAccess.getSitesByOrganizationIDWithLatestAudits = () => [];
    const resp = await notFoundExternalDigestHandler(noAuditContext);
    expect(resp.status).to.equal(204);
  });

  it('returns 500 if the initial slack api fails', async () => {
    context.slackClients = {
      ADOBE_EXTERNAL: { postMessage: sandbox.stub().rejects(new Error('error')) },
    };
    const resp = await notFoundExternalDigestHandler(context);
    expect(resp.status).to.equal(500);
  });

  it('continues if just one slack api call failed', async () => {
    const channel = 'channel1';
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves(backlink),
    };
    context.slackClients = {
      ADOBE_EXTERNAL: { postMessage: sandbox.stub().onFirstCall().resolves({ channel, ts: 'ts-1' }) },
    };
    context.slackClients.ADOBE_EXTERNAL.postMessage.onSecondCall().rejects(new Error('error'));

    const resp = await notFoundExternalDigestHandler(context);
    expect(resp.status).to.equal(204);
  });

  it('builds and sends the slack message when there is an site config and a 404 audit stored for the site', async () => {
    const channel = 'channel1';
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves(backlink),
    };
    context.slackClients = {
      ADOBE_EXTERNAL: { postMessage: sandbox.stub().resolves({ channel, ts: 'ts-1' }) },
    };
    const siteContext = { ...context };
    const newOrgData = {
      ...organizationData1,
      getConfig: () => ({
        alerts: [{
          type: '404',
          byOrg: false,
        }],
      }),
    };
    siteContext.dataAccess.getOrganizations = sinon.stub().resolves([newOrgData]);
    const resp = await notFoundExternalDigestHandler(siteContext);
    expect(resp.status).to.equal(204);
  });

  it('builds and sends the slack message when there is an site config and a 404 audit stored for the site and no backlink', async () => {
    const channel = 'channel1';
    context.rumApiClient = {
      create404Backlink: sandbox.stub().rejects('error'),
    };
    context.slackClients = {
      ADOBE_EXTERNAL: { postMessage: sandbox.stub().resolves({ channel, ts: 'ts-1' }) },
    };
    const siteContext = { ...context };
    const newOrgData = {
      ...organizationData1,
      getConfig: () => ({
        alerts: [{
          type: '404',
          byOrg: false,
        }],
      }),
    };
    siteContext.dataAccess.getOrganizations = sinon.stub().resolves([newOrgData]);
    const resp = await notFoundExternalDigestHandler(siteContext);
    expect(resp.status).to.equal(204);
  });
});
