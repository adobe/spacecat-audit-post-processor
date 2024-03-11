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
import { BaseSlackClient } from '@adobe/spacecat-shared-slack-client';
import { createSite } from '@adobe/spacecat-shared-data-access/src/models/site.js';
import { createOrganization } from '@adobe/spacecat-shared-data-access/src/models/organization.js';
import externalDigestHandler from '../../src/digest/handler-external.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('external handler', () => {
  let context;
  let mockDataAccess;
  let mockSlackClient;
  let processLatestAudit = sandbox.stub();
  let sendReport = sandbox.stub();

  const orgByOrgTrue = createOrganization({
    id: 'org-with-by-org-true',
    name: 'org-with-by-org-true',
    config: {
      alerts: [
        {
          type: '404',
          byOrg: true,
        },
        {
          type: 'broken-backlinks',
          byOrg: true,
          mentions: [{
            slack: [],
          }],
        },
      ],
      slack: {
        channel: 'C06CNBHRH4D',
      },
    },
  });
  const org2ByOrgTrue = createOrganization({
    id: 'org2-with-by-org-true',
    name: 'org2-with-by-org-true',
    config: {
      alerts: [
        {
          type: 'broken-backlinks',
          byOrg: true,
        },
      ],
      slack: {
        channel: 'C06CNBHRHM6',
      },
    },
  });
  const orgByOrgFalse = createOrganization({
    id: 'org-with-by-org-false',
    name: 'org-with-by-org-false',
    config: {
      alerts: [
        {
          type: 'broken-backlinks',
          byOrg: false,
        },
      ],
      slack: {},
    },
  });
  const siteByOrgTrue = createSite({
    id: 'site-with-alert-config-org-level',
    baseURL: 'https://abcd.com',
    organizationId: orgByOrgTrue.getId(),
    config: {
      alerts: [
        {
          type: '404',
        },
        {
          type: 'broken-backlinks',
        },
      ],
      slack: {},
    },
  });
  siteByOrgTrue.setAudits([{
    state: {
      auditResult: {
        brokenBacklinks: [
          {
            title: 'backlink title',
            url_from: 'https://from.com/from-1',
            url_to: 'https://www.abcd.com/to-1',
          },
          {
            title: 'backlink title 2',
            url_from: 'https://from.com/from-2',
            url_to: 'https://www.abcd.com/to-2',
          },
        ],
        finalUrl: 'www.abcd.com',
        fullAuditRef: 'https://audit-ref.com/full-audit-ref',
      },
    },
  }]);
  const site2ByOrgTrue = createSite({
    id: 'site2-with-alert-config-org-level',
    baseURL: 'https://xyz.com',
    organizationId: orgByOrgTrue.getId(),
    config: {
      alerts: [
        {
          type: 'broken-backlinks',
        },
      ],
      slack: {},
    },
  });
  site2ByOrgTrue.setAudits([{
    state: {
      auditResult: {
        brokenBacklinks: [],
        finalUrl: 'xyz.com',
        fullAuditRef: 'https://audit-ref.com/full-audit-ref',
      },
    },
  }]);
  const site3ByOrgTrue = createSite({
    id: 'site3-with-alert-config-org-level',
    baseURL: 'https://test.com',
    organizationId: org2ByOrgTrue.getId(),
    config: {
      alerts: [
        {
          type: 'broken-backlinks',
        },
      ],
      slack: {},
    },
  });
  site3ByOrgTrue.setAudits([{
    state: {
      auditResult: {
        brokenBacklinks: [],
        finalUrl: 'test.com',
        fullAuditRef: 'https://audit-ref.com/full-audit-ref',
      },
    },
  }]);

  const siteByOrgFalse = createSite({
    id: 'site-with-alert-config-site-level',
    baseURL: 'https://foo.bar.com',
    organizationId: orgByOrgFalse.getId(),
    config: {
      alerts: [
        {
          type: 'broken-backlinks',
          mentions: [
            {
              slack: [
                '<@U04N8J8FL6H>',
              ],
            },
          ],
        },
      ],
      slack: {
        channel: 'C06CNBHRH12',
      },
    },
  });
  siteByOrgFalse.setAudits([{
    state: {
      auditResult: {
        brokenBacklinks: [
          {
            title: 'backlink title',
            url_from: 'https://from.com/from-1',
            url_to: 'https://foo.bar.com/to-1',
          },
        ],
        finalUrl: 'foo.bar.com',
        fullAuditRef: 'https://audit-ref.com/full-audit-ref',
      },
    },
  }]);
  const site2ByOrgFalse = createSite({
    id: 'site2-with-alert-config-site-level',
    baseURL: 'https://bar.com',
    organizationId: orgByOrgFalse.getId(),
    config: {
      alerts: [
        {
          type: 'broken-backlinks',
        },
      ],
      slack: {
        channel: 'C06CNBHRH21',
      },
    },
  });
  site2ByOrgFalse.setAudits([{
    state: {
      auditResult: {
        brokenBacklinks: [],
        finalUrl: 'bar.com',
        fullAuditRef: 'https://audit-ref.com/full-audit-ref',
      },
    },
  }]);

  beforeEach('setup', () => {
    mockDataAccess = {
      getOrganizations: sandbox.stub(),
      getSitesByOrganizationIDWithLatestAudits: sandbox.stub(),
    };
    mockSlackClient = {
      postMessage: sandbox.stub(),
    };
    context = {
      log: {
        error: sandbox.stub(),
      },
      dataAccess: mockDataAccess,
      slackClients: {
        WORKSPACE_EXTERNAL_STANDARD: mockSlackClient,
      },
    };
    sandbox.stub(BaseSlackClient, 'createFrom').returns(mockSlackClient);
    processLatestAudit = sandbox.stub();
    sendReport = sandbox.stub();
  });

  afterEach('clean', () => {
    sandbox.restore();
  });

  it('should skip if no organizations', async () => {
    mockDataAccess.getOrganizations.resolves([]);

    const response = await externalDigestHandler(context, '404', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(mockDataAccess.getOrganizations).to.have.been.calledOnce;
    expect(processLatestAudit).not.to.have.been.called;
    expect(mockSlackClient.postMessage).not.to.have.been.called;
    expect(sendReport).not.to.have.been.called;
    expect(context.log.error).not.to.have.been.called;
  });

  it('should skip the organization if it does not have an alert config of matching type', async () => {
    mockDataAccess.getOrganizations.resolves([{
      getId: () => 'some-id',
      getConfig: () => ({ alerts: [{ type: '404' }] }),
    }]);

    const response = await externalDigestHandler(context, 'broken-backlinks', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(mockDataAccess.getOrganizations).to.have.been.calledOnce;
    expect(processLatestAudit).not.to.have.been.called;
    expect(mockSlackClient.postMessage).not.to.have.been.called;
    expect(sendReport).not.to.have.been.called;
    expect(context.log.error).not.to.have.been.called;
  });

  it('should skip the organization if there are no sites for an organization', async () => {
    mockDataAccess.getOrganizations.resolves([{
      getId: () => 'some-id',
      getConfig: () => ({ alerts: [{ type: 'broken-backlinks' }] }),
    }]);
    mockDataAccess.getSitesByOrganizationIDWithLatestAudits.resolves([]);

    const response = await externalDigestHandler(context, 'broken-backlinks', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(mockDataAccess.getOrganizations).to.have.been.calledOnce;
    expect(mockDataAccess.getSitesByOrganizationIDWithLatestAudits).to.have.been.calledOnceWith('some-id', 'broken-backlinks', false);
    expect(processLatestAudit).not.to.have.been.called;
    expect(mockSlackClient.postMessage).not.to.have.been.called;
    expect(sendReport).not.to.have.been.called;
    expect(context.log.error).not.to.have.been.called;
  });

  it('should skip the site if it does not have any audits', async () => {
    mockDataAccess.getOrganizations.resolves([{
      getId: () => 'some-id',
      getConfig: () => ({ alerts: [{ type: 'broken-backlinks' }] }),
    }]);
    mockDataAccess.getSitesByOrganizationIDWithLatestAudits.resolves([{
      getAudits: () => [],
    }]);

    const response = await externalDigestHandler(context, 'broken-backlinks', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(mockDataAccess.getOrganizations).to.have.been.calledOnce;
    expect(mockDataAccess.getSitesByOrganizationIDWithLatestAudits).to.have.been.calledOnceWith('some-id', 'broken-backlinks', false);
    expect(processLatestAudit).not.to.have.been.called;
    expect(mockSlackClient.postMessage).not.to.have.been.called;
    expect(sendReport).not.to.have.been.called;
    expect(context.log.error).not.to.have.been.called;
  });

  it('should skip the site if processLatestAudit function does not return any message', async () => {
    mockDataAccess.getOrganizations.resolves([orgByOrgTrue]);
    mockDataAccess.getSitesByOrganizationIDWithLatestAudits.resolves([siteByOrgTrue]);
    processLatestAudit.withArgs(context, siteByOrgTrue, siteByOrgTrue.getAudits()).returns({});

    const response = await externalDigestHandler(context, 'broken-backlinks', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(mockDataAccess.getOrganizations).to.have.been.calledOnce;
    expect(mockDataAccess.getSitesByOrganizationIDWithLatestAudits).to.have.been.calledOnceWith(orgByOrgTrue.getId(), 'broken-backlinks', false);
    expect(mockSlackClient.postMessage).not.to.have.been.called;
    expect(sendReport).not.to.have.been.called;
    expect(context.log.error).not.to.have.been.called;
  });

  it('should continue with the other sites/orgs when the sendInitialMessage function throws an error', async () => {
    mockDataAccess.getOrganizations.resolves([orgByOrgTrue, org2ByOrgTrue]);
    mockDataAccess.getSitesByOrganizationIDWithLatestAudits.withArgs(orgByOrgTrue.getId(), 'broken-backlinks', false)
      .resolves([siteByOrgTrue, site2ByOrgTrue]);
    mockDataAccess.getSitesByOrganizationIDWithLatestAudits.withArgs(org2ByOrgTrue.getId(), 'broken-backlinks', false)
      .resolves([site3ByOrgTrue]);
    processLatestAudit.withArgs(context, siteByOrgTrue, siteByOrgTrue.getAudits())
      .returns(siteByOrgTrue.getAudits()[0].state.auditResult);
    processLatestAudit.withArgs(context, site2ByOrgTrue, site2ByOrgTrue.getAudits())
      .returns(site2ByOrgTrue.getAudits()[0].state.auditResult);
    processLatestAudit.withArgs(context, site3ByOrgTrue, site3ByOrgTrue.getAudits())
      .returns(site3ByOrgTrue.getAudits()[0].state.auditResult);
    mockSlackClient.postMessage.onFirstCall().rejects(new Error('Failed to send initial message'));
    mockSlackClient.postMessage.onSecondCall().resolves({ threadId: 'thread-id' });
    mockSlackClient.postMessage.onThirdCall().resolves({ threadId: 'thread-id' });

    const response = await externalDigestHandler(context, 'broken-backlinks', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(mockSlackClient.postMessage).to.have.been.calledThrice;
    expect(mockSlackClient.postMessage).to.have.been.calledWith({
      channel: orgByOrgTrue.getConfig().slack.channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: ' INITIAL_MESSAGE',
          },
        },
      ],
    });
    expect(mockSlackClient.postMessage).to.have.been.calledWith({
      channel: orgByOrgTrue.getConfig().slack.channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: ' INITIAL_MESSAGE',
          },
        },
      ],
    });
    expect(mockSlackClient.postMessage).to.have.been.calledWith({
      channel: org2ByOrgTrue.getConfig().slack.channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'INITIAL_MESSAGE',
          },
        },
      ],
    });
    const siteByOrgTrueSlackContext = {
      channel: orgByOrgTrue.getConfig().slack.channel,
      mentions: [],
    };
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: siteByOrgTrueSlackContext,
      message: siteByOrgTrue.getAudits()[0].state.auditResult,
    });
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: { thread_ts: 'thread-id', channel: orgByOrgTrue.getConfig().slack.channel },
      message: site2ByOrgTrue.getAudits()[0].state.auditResult,
    });
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: { thread_ts: 'thread-id', channel: org2ByOrgTrue.getConfig().slack.channel },
      message: site3ByOrgTrue.getAudits()[0].state.auditResult,
    });
    expect(context.log.error).to.have.been.calledOnceWith('Failed to send initial Slack message for https://abcd.com to '
      + `${JSON.stringify(siteByOrgTrueSlackContext)}. Reason: Failed to send initial message`);
  });

  it('should continue with the other sites/orgs when the sendReport function throws an error', async () => {
    mockDataAccess.getOrganizations.resolves([orgByOrgFalse]);
    mockDataAccess.getSitesByOrganizationIDWithLatestAudits
      .resolves([siteByOrgFalse, site2ByOrgFalse]);
    processLatestAudit.withArgs(context, siteByOrgFalse, siteByOrgFalse.getAudits())
      .returns(siteByOrgFalse.getAudits()[0].state.auditResult);
    processLatestAudit.withArgs(context, site2ByOrgFalse, site2ByOrgFalse.getAudits())
      .returns(site2ByOrgFalse.getAudits()[0].state.auditResult);
    mockSlackClient.postMessage.resolves({ threadId: 'thread-id' });
    sendReport.onFirstCall().rejects(new Error('Failed to send report'));

    const response = await externalDigestHandler(context, 'broken-backlinks', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(sendReport).to.have.been.calledTwice;
    const siteByOrgFalseSlackContext = {
      channel: siteByOrgFalse.getConfig().slack.channel,
      mentions: siteByOrgFalse.getConfig().alerts[0].mentions[0].slack,
    };
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: siteByOrgFalseSlackContext,
      message: siteByOrgFalse.getAudits()[0].state.auditResult,
    });
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: {
        channel: site2ByOrgFalse.getConfig().slack.channel,
        mentions: '',
      },
      message: site2ByOrgFalse.getAudits()[0].state.auditResult,
    });
    expect(context.log.error).to.have.been.calledOnceWith('Failed to send Slack message for https://foo.bar.com to '
      + `${JSON.stringify(siteByOrgFalseSlackContext)}. Reason: Failed to send report`);
  });

  it('should use slack in site config to send initial message and report when alert is byOrg false', async () => {
    mockDataAccess.getOrganizations.resolves([orgByOrgFalse]);
    mockDataAccess.getSitesByOrganizationIDWithLatestAudits
      .resolves([siteByOrgFalse, site2ByOrgFalse]);
    processLatestAudit.withArgs(context, siteByOrgFalse, siteByOrgFalse.getAudits())
      .returns(siteByOrgFalse.getAudits()[0].state.auditResult);
    processLatestAudit.withArgs(context, site2ByOrgFalse, site2ByOrgFalse.getAudits())
      .returns(site2ByOrgFalse.getAudits()[0].state.auditResult);
    mockSlackClient.postMessage.resolves({ threadId: 'thread-id' });

    const response = await externalDigestHandler(context, 'broken-backlinks', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(mockSlackClient.postMessage).to.not.have.been.called;
    expect(sendReport).to.have.been.calledTwice;
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: {
        channel: siteByOrgFalse.getConfig().slack.channel,
        mentions: siteByOrgFalse.getConfig().alerts[0].mentions[0].slack,
      },
      message: siteByOrgFalse.getAudits()[0].state.auditResult,
    });
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: {
        channel: site2ByOrgFalse.getConfig().slack.channel,
        mentions: '',
      },
      message: site2ByOrgFalse.getAudits()[0].state.auditResult,
    });
    expect(context.log.error).not.to.have.been.called;
  });

  it('should use slack in org config to send initial message and report when alert is byOrg true', async () => {
    mockDataAccess.getOrganizations.resolves([orgByOrgTrue, org2ByOrgTrue]);
    mockDataAccess.getSitesByOrganizationIDWithLatestAudits.withArgs(orgByOrgTrue.getId(), 'broken-backlinks', false)
      .resolves([siteByOrgTrue, site2ByOrgTrue]);
    mockDataAccess.getSitesByOrganizationIDWithLatestAudits.withArgs(org2ByOrgTrue.getId(), 'broken-backlinks', false)
      .resolves([site3ByOrgTrue]);
    processLatestAudit.withArgs(context, siteByOrgTrue, siteByOrgTrue.getAudits())
      .returns(siteByOrgTrue.getAudits()[0].state.auditResult);
    processLatestAudit.withArgs(context, site2ByOrgTrue, site2ByOrgTrue.getAudits())
      .returns(site2ByOrgTrue.getAudits()[0].state.auditResult);
    processLatestAudit.withArgs(context, site3ByOrgTrue, site3ByOrgTrue.getAudits())
      .returns(site3ByOrgTrue.getAudits()[0].state.auditResult);
    mockSlackClient.postMessage.resolves({ threadId: 'thread-id' });

    const response = await externalDigestHandler(context, 'broken-backlinks', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(mockSlackClient.postMessage).to.have.been.calledTwice;
    expect(mockSlackClient.postMessage).to.have.been.calledWith({
      channel: orgByOrgTrue.getConfig().slack.channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: ' INITIAL_MESSAGE',
          },
        },
      ],
    });
    expect(mockSlackClient.postMessage).to.have.been.calledWith({
      channel: org2ByOrgTrue.getConfig().slack.channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'INITIAL_MESSAGE',
          },
        },
      ],
    });
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: { thread_ts: 'thread-id', channel: orgByOrgTrue.getConfig().slack.channel },
      message: siteByOrgTrue.getAudits()[0].state.auditResult,
    });
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: { thread_ts: 'thread-id', channel: orgByOrgTrue.getConfig().slack.channel },
      message: site2ByOrgTrue.getAudits()[0].state.auditResult,
    });
    expect(sendReport).to.have.been.calledWith({
      slackClient: mockSlackClient,
      slackContext: { thread_ts: 'thread-id', channel: org2ByOrgTrue.getConfig().slack.channel },
      message: site3ByOrgTrue.getAudits()[0].state.auditResult,
    });
    expect(context.log.error).not.to.have.been.called;
  });
});
