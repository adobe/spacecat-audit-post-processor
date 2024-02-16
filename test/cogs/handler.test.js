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

import sinon from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import cogsHandler from '../../src/cogs/handler.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;

const sandbox = sinon.createSandbox();
const COGS_HELIX_HOST = 'https://main--sharepoint--sudo-buddy.hlx.page';
const COGS_SPREADSHEET_PATH = '/spacecatpoc';
// eslint-disable-next-line no-undef
describe('cogs handler', () => {
  let message;
  let context;
  // eslint-disable-next-line no-undef
  beforeEach('setup', () => {
    message = {
      monthYear: 'Dec-23',
      usageCost: {
        LAMBDA: '14.67',
        'SECRETS MANAGER': '0.09',
        DYNAMODB: '0.10',
        SQS: '0.17',
        S3: '0.00',
        CLOUDWATCH: '0.05',
      },
    };
    context = {
      log: console,
      env: {
        COGS_EXCEL_POST_URL: `${COGS_HELIX_HOST}${COGS_SPREADSHEET_PATH}`,
      },
    };
  });
  // eslint-disable-next-line no-undef
  afterEach('clean', () => {
    sandbox.restore();
    nock.cleanAll();
  });

  // eslint-disable-next-line no-undef
  it('reject when MonthYear is missing', async () => {
    delete message.monthYear;
    const result = await cogsHandler(message, context);
    expect(result.status).equal(400);
  });
  // eslint-disable-next-line no-undef
  it('reject when UsageCost is missing', async () => {
    delete message.usageCost;
    const result = await cogsHandler(message, context);
    expect(result.status).equal(400);
  });
  // eslint-disable-next-line no-undef
  it('reject when helix returns 400', async () => {
    nock(COGS_HELIX_HOST)
      .post(COGS_SPREADSHEET_PATH)
      .reply(400);
    const result = await cogsHandler(message, context);
    expect(result.status)
      .equal(400);
  });
  // eslint-disable-next-line no-undef
  it('reject when COGS_EXCEL_POST_URL is missing', async () => {
    delete context.env.COGS_EXCEL_POST_URL;
    nock(COGS_HELIX_HOST)
      .post(COGS_SPREADSHEET_PATH)
      .reply(500);
    const result = await cogsHandler(message, context);
    expect(result.status)
      .equal(500);
  });
  // eslint-disable-next-line no-undef
  it('should post data to COGS Excel', async () => {
    nock(COGS_HELIX_HOST)
      .post(COGS_SPREADSHEET_PATH, { data: { MONTH: 'Dec-23', ...message.usageCost } })
      .reply(201);
    const result = await cogsHandler(message, context);
    expect(result.status)
      .equal(204);
  });
});
