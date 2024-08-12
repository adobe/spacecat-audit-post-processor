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

  beforeEach(() => {
    dataAccessMock = {
      getLatestAuditForSite: sinon.stub(),
      updateLatestAudit: sinon.stub(),
    };
    log = {
      info: sinon.spy(),
      error: sinon.spy(),
    };
    context = {
      log,
      dataAccess: dataAccessMock,
    };
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

    dataAccessMock.getLatestAuditForSite.resolves(null);

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

    const audit = {
      auditResult: {
        brokenBacklinks: [{ url_to: 'https://broken.url' }],
      },
    };

    dataAccessMock.getLatestAuditForSite.resolves(audit);

    await brokenBacklinksAutoSuggestHandler(message, context);

    expect(dataAccessMock.updateLatestAudit).to.have.been.calledWith({
      ...audit,
      auditResult: {
        ...audit.auditResult,
        brokenBacklinks: [{ url_to: 'https://broken.url', urls_suggested: ['https://suggested1.url', 'https://suggested2.url'] }],
      },
    });
  });
});
