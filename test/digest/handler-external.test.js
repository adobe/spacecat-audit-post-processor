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
import externalDigestHandler from '../../src/digest/handler-external.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('external handler', () => {
  let context;
  let mockDataAccess;
  let mockSlackClient;
  const processLatestAudit = sandbox.stub();
  const sendReport = sandbox.stub();

  beforeEach('setup', () => {
    mockDataAccess = {
      getOrganizations: sandbox.stub(),
      getSitesByOrganizationIDWithLatestAudits: sandbox.stub(),
    };
    mockSlackClient = {
      postMessage: sandbox.stub().resolves(),
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
  });

  afterEach('clean', () => {
    sandbox.restore();
  });

  it('should skip if no organizations', async () => {
    mockDataAccess.getOrganizations.resolves([]);

    const response = await externalDigestHandler(context, 'type', 'INITIAL_MESSAGE', processLatestAudit, sendReport);

    expect(response.status).to.equal(204);
    expect(mockDataAccess.getOrganizations).to.have.been.calledOnce;
    expect(context.log.error).not.to.have.been.called;
    expect(processLatestAudit).not.to.have.been.called;
    expect(sendReport).not.to.have.been.called;
  });

  it('should skip the organization if it does not have an alert config', async () => {
  });

  it('should skip the organization if there are no sites for an organization', async () => {
  });

  it('should skip the site if it does not have any audits', async () => {
  });

  it('should skip the site if processLatestAudit function does not return any message', async () => {
  });

  it('should continue with the other sites/orgs when the dataAccess function throws an error for one of the sites/orgs', async () => {
  });

  it('should continue with the other sites/orgs when the sendInitialMessage function throws an error', async () => {
  });

  it('should continue with the other sites/orgs when the sendReport function throws an error', async () => {
  });

  it('should use slack in site config to send initial message and report when alert is byOrg false', async () => {
  });

  it('should use slack in org config to send initial message and report when alert is byOrg true', async () => {
  });

  it('should send initial message only once per each organization', async () => {
  });

  it('should pass message returned by processLatestAudit to sendReport', async () => {
  });
});
