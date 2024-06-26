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

import chai from 'chai';
import { processLatest404Audit } from '../../src/support/notfound.js';

const { expect } = chai;
describe('not found util', () => {
  const auditData = {
    state: {
      auditResult: [
        {
          url: 'https://www.abcd.com/sites/default/files/en/assets/training-material/dd/img',
          pageviews: '300',
          sources: ['https://www.abcd.com/sites/default/files/en/assets/training-material/dd/img/', 'www,google.com'],
        },
      ],
      finalUrl: 'abcd.com',
    },
  };
  auditData.getAuditedAt = () => new Date().toISOString();

  it('processLatest404Audit with auditResults in audit', () => {
    const latestAudits = [auditData];
    const site = { getBaseURL: () => 'https://abcd.com' };
    auditData.getAuditResult = () => auditData.state.auditResult;
    auditData.getFullAuditRef = () => 'https://helix-pages.anywhere.run/helix-services/run-query@v3/rum-sources?domainkey=hebele&interval=7&offset=0&limit=101&checkpoint=404&url=http%3A%2F%2Fspacecar.com';
    const message = processLatest404Audit({}, site, latestAudits);
    expect(message.results).to.deep.equal(auditData.state.auditResult);
  });

  it('processLatest404Audit with empty latest audit', () => {
    const latestAudits = [];
    const site = { getBaseURL: () => 'https://abcd.com' };
    const message = processLatest404Audit({}, site, latestAudits);
    expect(message).to.deep.equal({});
  });

  it('processLatest404Audit with undefined latest audit', () => {
    const site = { getBaseURL: () => 'https://abcd.com' };
    const message = processLatest404Audit({}, site);
    expect(message).to.deep.equal({});
  });

  it('processLatest404Audit with empty results in latest audit', () => {
    auditData.getAuditResult = () => ({ result: [] });
    const latestAudits = [auditData];
    const site = { getBaseURL: () => 'https://abcd.com' };
    const message = processLatest404Audit({}, site, latestAudits);
    expect(message).to.deep.equal({});
  });

  it('processLatest404Audit with undefined results in latest audit', () => {
    auditData.getAuditResult = () => ({ });
    const latestAudits = [auditData];
    const site = { getBaseURL: () => 'https://abcd.com' };
    const message = processLatest404Audit({}, site, latestAudits);
    expect(message).to.deep.equal({});
  });
});
