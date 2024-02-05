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
  auditData.getAuditedAt = () => new Date().toISOString();
  it('processLatest404Audit  with results in audit', () => {
    const latestAudits = [auditData];
    const site = { getBaseURL: () => 'https://abcd.com' };
    auditData.getAuditResult = () => auditData.state.auditResult;
    const message = processLatest404Audit({}, site, latestAudits);
    expect(message.results).to.deep.equal(auditData.state.auditResult.result);
  });

  it('processLatest404Audit with empty latest audit', () => {
    const latestAudits = [];
    const site = { getBaseURL: () => 'https://abcd.com' };
    const message = processLatest404Audit({}, site, latestAudits);
    expect(message).to.deep.equal({});
  });

  it('processLatest404Audit with empty results in latest audit', () => {
    auditData.getAuditResult = () => ({ result: [] });
    const latestAudits = [auditData];
    const site = { getBaseURL: () => 'https://abcd.com' };
    const message = processLatest404Audit({}, site, latestAudits);
    expect(message).to.deep.equal({});
  });
});
