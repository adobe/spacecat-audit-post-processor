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
import { getSlackContextForAlert, isDigestReport } from '../../src/support/config.js';

const { expect } = chai;
describe('config util', () => {
  it('getSlackContextForAlert for valid configs byOrg', () => {
    const orgConfig = {
      slack: {
        workspace: 'workspace1',
        channel: 'channel1',
      },
      alerts: [{
        type: '404',
        byOrg: true,
        mentions: [{ slack: ['slackId1'] }],
      }],
    };
    const siteConfig = {
      slack: {
        workspace: 'workspace2',
        channel: 'channel2',
      },
      alerts: [{
        type: '404',
        mentions: [{ slack: ['slackId2'] }],
      }],
    };
    const slackContext = getSlackContextForAlert(orgConfig, siteConfig, '404');
    expect(slackContext.channel).to.equal('channel1');
    expect(slackContext.mentions).to.deep.equal(['slackId1']);
  });

  it('getSlackContextForAlert for valid configs bySite', () => {
    const orgConfig = {
      slack: {
        workspace: 'workspace1',
        channel: 'channel1',
      },
      alerts: [{
        type: '404',
        byOrg: false,
        mentions: [{ slack: ['slackId1'] }],
      }],
    };
    const siteConfig = {
      slack: {
        workspace: 'workspace2',
        channel: 'channel2',
      },
      alerts: [{
        type: '404',
        mentions: [{ slack: ['slackId2'] }],
      }],
    };
    const slackContext = getSlackContextForAlert(orgConfig, siteConfig, '404');
    expect(slackContext.channel).to.equal('channel2');
    expect(slackContext.mentions).to.deep.equal(['slackId2']);
  });

  it('isDigestReport for valid configs bySite', () => {
    const orgConfig = {
      alerts: [{
        type: '404',
      }],
    };
    const siteConfig = {
      slack: {
        workspace: 'workspace2',
        channel: 'channel2',
      },
      alerts: [{
        type: '404',
        byOrg: false,
        mentions: [{ slack: ['slackId2'] }],
      }],
    };
    const isDigest = isDigestReport(orgConfig, siteConfig, '404');
    expect(isDigest).to.be.false;
  });

  it('getSlackContextForAlert returns only slack channel if no alerts are in config', () => {
    const orgConfig = {
      slack: {
        workspace: 'workspace1',
        channel: 'channel1',
      },
      alerts: [{
        byOrg: true,
        mentions: [{ slack: ['slackId1'] }],
      }],
    };
    const slackContext = getSlackContextForAlert(orgConfig, {}, '404');
    expect(slackContext.channel).to.be.undefined;
    expect(slackContext.mentions).to.equal('');
  });

  it('getSlackContextForAlert for empty config', () => {
    const slackContext = getSlackContextForAlert({}, {}, '404');
    expect(slackContext.channel).to.be.undefined;
    expect(slackContext.mentions).to.equal('');
  });

  it(' for empty config', () => {
    const config = {
    };
    const isByOrg = isDigestReport(config, {}, '404');
    expect(isByOrg).to.be.false;
  });
});
