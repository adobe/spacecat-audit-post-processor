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
import { sendBrokenBacklinksReport, processLatestBrokenBacklinksAudit } from '../../src/backlinks/utils.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const auditResult = {
  brokenBacklinks: [
    {
      title: 'backlink title',
      url_from: 'https://from.com/from-1',
      url_to: 'https://www.abcd.com/to-1',
      languages: ['en'],
    },
    {
      title: 'backlink title 2',
      url_from: 'https://from.com/from-2',
      url_to: 'https://www.abcd.com/to-2',
      languages: ['en'],
    },
  ],
  finalUrl: 'www.abcd.com',
  fullAuditRef: 'https://audit-ref.com/full-audit-ref',
};

describe('backlinks util: processLatestBrokenBacklinksAudit', () => {
  const auditData = {
    state: {
      auditResult,
    },
  };
  auditData.getAuditedAt = () => new Date().toISOString();

  it('latest audit has brokenBacklinks > return message with brokenBacklinks from latest audit in the list', () => {
    const site = { getBaseURL: () => 'https://abcd.com' };
    const latestAudits = [auditData, {}];
    auditData.getAuditResult = () => auditData.state.auditResult;

    const message = processLatestBrokenBacklinksAudit({}, site, latestAudits);

    expect(message.brokenBacklinks).to.deep.equal(auditData.state.auditResult.brokenBacklinks);
    expect(message.finalUrl).to.deep.equal(auditData.state.auditResult.finalUrl);
    expect(message.fullAuditRef).to.deep.equal(auditData.state.auditResult.fullAuditRef);
  });

  it('empty latest audit > return empty message', () => {
    const site = { getBaseURL: () => 'https://abcd.com' };
    const latestAudits = [];

    const message = processLatestBrokenBacklinksAudit({}, site, latestAudits);

    expect(message).to.deep.equal({});
  });

  it('latest audit older than set days > return empty message', () => {
    const site = { getBaseURL: () => 'https://abcd.com' };
    const latestAudits = [auditData];
    auditData.getAuditedAt = () => new Date('2010-01-01').toISOString();

    const message = processLatestBrokenBacklinksAudit({}, site, latestAudits);

    expect(message).to.deep.equal({});
  });

  it('no brokenBacklinks in latest audit > return empty message', () => {
    const site = { getBaseURL: () => 'https://abcd.com' };
    auditData.getAuditResult = () => ({ brokenBacklinks: [] });
    const latestAudits = [auditData];

    const message = processLatestBrokenBacklinksAudit({}, site, latestAudits);

    expect(message).to.deep.equal({});
  });
});

describe('backlinks util: sendBrokenBacklinksReport', () => {
  const sandbox = sinon.createSandbox();

  let message;
  let slackClient;
  let slackContext;
  let fileUpload;

  beforeEach(() => {
    message = {
      finalUrl: auditResult.finalUrl,
      brokenBacklinks: auditResult.brokenBacklinks,
    };

    fileUpload = sinon.stub();
    fileUpload.returns(Promise.resolve({}));
    slackClient = {
      fileUpload,
    };
    slackContext = {
      channel: 'channel-id',
      thread_ts: 'thread-id',
      mentions: ['@user1', '@user2'],
    };
  });

  afterEach('clean', () => {
    sandbox.restore();
  });

  it('message with brokenBacklinks > call slackClient file upload with proper params, including mentions', async () => {
    await sendBrokenBacklinksReport({
      message,
      slackClient,
      slackContext,
    });

    expect(slackClient.fileUpload).to.have.been.calledOnce;
    expect(slackClient.fileUpload).to.have.been.calledWith({
      thread_ts: 'thread-id',
      channel_id: 'channel-id',
      mentions: ['@user1', '@user2'],
      file: sinon.match.any,
      filename: sinon.match(/broken-backlinks-www-abcd-com-\d{4}-\d{2}-\d{2}\.csv/),
      initial_comment: `@user1 @user2 For *www.abcd.com*, ${message.brokenBacklinks.length} broken backlink(s) were detected.\nThe following CSV file contains a`
        + ' detailed report for all broken backlinks:',
      unfurl_links: false,
    });
  });

  it('message with brokenBacklinks > call slackClient file upload with proper params, with no mentions', async () => {
    slackContext.mentions = undefined;

    await sendBrokenBacklinksReport({
      slackClient,
      slackContext,
      message,
    });

    expect(slackClient.fileUpload).to.have.been.calledOnce;
    expect(slackClient.fileUpload).to.have.been.calledWith({
      thread_ts: 'thread-id',
      channel_id: 'channel-id',
      mentions: undefined,
      file: sinon.match.any,
      filename: sinon.match(/broken-backlinks-www-abcd-com-\d{4}-\d{2}-\d{2}\.csv/),
      initial_comment: ` For *www.abcd.com*, ${message.brokenBacklinks.length} broken backlink(s) were detected.\nThe following CSV file contains a`
        + ' detailed report for all broken backlinks:',
      unfurl_links: false,
    });
  });
});
