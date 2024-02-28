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
import esmock from 'esmock';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();

describe('broken backlinks internal handler', () => {
  let message;
  let context;

  beforeEach('setup', () => {
    message = {
      url: 'space.cat',
      auditContext: {
        slackContext: {
          channel: 'channel-id',
          ts: 'thread-id',
        },
      },
      auditResult: {
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
      },
    };

    context = {
    };
  });

  afterEach('cleanup', () => {
    sandbox.restore();
  });

  it('should call internalDigestHandler with the correct arguments', async () => {
    const digestHandlerStub = sandbox.stub().resolves();
    const processLatestBrokenBacklinksAuditStub = sandbox.stub().resolves();
    const sendBrokenBacklinksReportStub = sandbox.stub().resolves();

    const brokenBacklinksHandlerModule = await esmock('../../src/backlinks/handler-internal.js', {
      '../../src/digest/handler-internal.js': { default: digestHandlerStub },
      '../../src/backlinks/utils.js': {
        INITIAL_BROKEN_BACKLINKS_SLACK_MESSAGE: 'initial message',
        processLatestBrokenBacklinksAudit: processLatestBrokenBacklinksAuditStub,
        sendBrokenBacklinksReport: sendBrokenBacklinksReportStub,
      },
    });

    await brokenBacklinksHandlerModule.default(message, context);

    expect(digestHandlerStub).to.have.been.calledWith(
      context,
      'broken-backlinks',
      'initial message',
      processLatestBrokenBacklinksAuditStub,
      sendBrokenBacklinksReportStub,
    );
  });
});
