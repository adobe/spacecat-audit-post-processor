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
import notFoundInternalDigestHandler from '../../src/digest/handler-internal.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('not found internal handler', () => {
  let context;
  const channel = 'channel1';
  const thread = 'thread1';
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
    getAudits: () => [auditData],
  };
  auditData.getAuditResult = () => auditData.state.auditResult;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  auditData.getAuditedAt = () => yesterday.toISOString();
  const mockDataAccess = {
    getSitesWithLatestAudit: sinon.stub().resolves([siteData]),
  };

  beforeEach('setup', () => {
    context = {
      log: console,
      dataAccess: mockDataAccess,
      env: {
        RUM_DOMAIN_KEY: 'uber-key',
        AUDIT_REPORT_SLACK_CHANNEL_ID: 'channel1',
      },
    };
  });

  afterEach('clean', () => {
    sandbox.restore();
  });

  it('builds and sends the slack message when there is an org config and a 404 audit stored for the site', async () => {
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves(backlink),
      getDomainList: sandbox.stub().resolves(['abcd.com']),
    };
    context.slackClients = {
      ADOBE_INTERNAL: {
        postMessage: sandbox.stub().resolves(
          { channelId: channel, threadId: thread },
        ),
      },
    };
    const resp = await notFoundInternalDigestHandler(context);
    expect(resp.status).to.equal(204);
  });

  it('continues if just one slack api call failed', async () => {
    context.rumApiClient = {
      create404Backlink: sandbox.stub().resolves(backlink),
      getDomainList: sandbox.stub().resolves(['abcd.com']),
    };
    context.slackClients = {
      ADOBE_INTERNAL: {
        postMessage: sandbox.stub().onFirstCall().resolves(
          { channelId: channel, threadId: thread },
        ),
      },
    };
    context.slackClients.ADOBE_INTERNAL.postMessage.onSecondCall().rejects(new Error('error'));
    const resp = await notFoundInternalDigestHandler(context);
    expect(resp.status).to.equal(204);
  });

  it('returns 500 if the initial slack api fails', async () => {
    context.rumApiClient = {
      getDomainList: sandbox.stub().resolves(['abcd.com']),
    };
    context.slackClients = {
      ADOBE_INTERNAL: { postMessage: sandbox.stub().onFirstCall().rejects(new Error('error')) },
    };
    const resp = await notFoundInternalDigestHandler(context);
    expect(resp.status).to.equal(500);
  });
});
