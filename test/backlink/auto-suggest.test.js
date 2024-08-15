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
import brokenBacklinksAutoSuggestHandler from '../../src/broken-backlinks/auto-suggest.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('brokenBacklinksAutoSuggestHandler', () => {
  let context;
  let log;
  let dataAccessMock;
  let auditMock;

  const auditResult = {
    brokenBacklinks: [{ url_to: 'https://broken.url' }],
  };

  beforeEach(() => {
    dataAccessMock = {
      getLatestAuditForSite: sinon.stub(),
      updateLatestAudit: sinon.stub(),
    };
    auditMock = {
      getAuditResult: sinon.stub(),
      getAuditedAt: sinon.stub(),
      getExpiresAt: sinon.stub(),
      getFullAuditRef: sinon.stub(),
      isLive: sinon.stub(),
      getPreviousAuditResult: sinon.stub(),
    };
    log = {
      info: sinon.spy(),
      error: sinon.spy(),
    };
    context = {
      log,
      dataAccess: dataAccessMock,
    };

    dataAccessMock.getLatestAuditForSite.resolves(auditMock);
    dataAccessMock.updateLatestAudit.resolves(auditMock);
    auditMock.getAuditResult.returns(auditResult);
    auditMock.getAuditedAt.returns(new Date('2024-04-16').toISOString());
    auditMock.getExpiresAt.returns(new Date('2024-07-16').toISOString());
    auditMock.getFullAuditRef.returns('https://example.com');
    auditMock.isLive.returns(true);
    auditMock.getPreviousAuditResult.returns({});
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should log error and return noContent when suggestionsResult.brokenBacklinks is empty', async () => {
    const message = {
      siteId: 'site123',
      type: 'type1',
    };

    await brokenBacklinksAutoSuggestHandler(message, context);

    expect(log.error).to.have.been.calledWith('No broken backlinks found in suggestions result');
  });

  it('should log error and return noContent when no audit is found', async () => {
    const message = {
      siteId: 'site123',
      type: 'type1',
      suggestionsResult: { brokenBacklinks: [{ broken_url: 'url1', suggested_url: 'url2' }] },
    };

    auditMock.getAuditResult.returns(null);

    await brokenBacklinksAutoSuggestHandler(message, context);

    expect(log.error).to.have.been.calledWith('No audit with broken backlinks found for site ID: site123');
  });

  it('should update audit and return noContent when audit is found', async () => {
    const message = {
      siteId: 'site123',
      type: 'type1',
      suggestionsResult: {
        brokenBacklinks: [
          { broken_url: 'https://broken.url', suggested_urls: ['https://suggested1.url', 'https://suggested2.url'] },
        ],
      },
    };

    await brokenBacklinksAutoSuggestHandler(message, context);

    expect(dataAccessMock.updateLatestAudit).to.have.been.calledWith({
      siteId: 'site123',
      auditType: 'broken-backlinks',
      auditedAt: auditMock.getAuditedAt(),
      expiresAt: auditMock.getExpiresAt(),
      fullAuditRef: auditMock.getFullAuditRef(),
      isLive: auditMock.isLive(),
      auditResult: {
        ...auditResult,
        brokenBacklinks: [{ url_to: 'https://broken.url', urls_suggested: ['https://suggested1.url', 'https://suggested2.url'] }],
      },
      previousAuditResult: auditMock.getPreviousAuditResult(),
    });
  });

  it('should return an empty array when suggested_urls is undefined', async () => {
    const message = {
      siteId: 'site123',
      type: 'type1',
      suggestionsResult: {
        brokenBacklinks: [
          { broken_url: 'https://broken.url' },
        ],
      },
    };

    await brokenBacklinksAutoSuggestHandler(message, context);

    expect(dataAccessMock.updateLatestAudit).to.have.been.calledWith({
      siteId: 'site123',
      auditType: 'broken-backlinks',
      auditedAt: auditMock.getAuditedAt(),
      expiresAt: auditMock.getExpiresAt(),
      fullAuditRef: auditMock.getFullAuditRef(),
      isLive: auditMock.isLive(),
      auditResult: {
        ...auditResult,
        brokenBacklinks: [{ url_to: 'https://broken.url', urls_suggested: [] }],
      },
      previousAuditResult: auditMock.getPreviousAuditResult(),
    });
  });
});
