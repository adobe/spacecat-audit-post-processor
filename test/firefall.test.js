/*
 * Copyright 2023 Adobe. All rights reserved.
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
import sinon from 'sinon';
import nock from 'nock';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

import { recommendations } from '../src/firefall/handler.js';

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(sinonChai);
nock.disableNetConnect();

describe('Optimization Recommendation', () => {
  let sandbox;
  let contextMock;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    contextMock = {
      dataAccess: {
        getLatestAuditForSite: sandbox.stub().resolves({
          getAuditResult: sandbox.stub().resolves({ result: 'Foo Bar' }),
        }),
      },
      log: {
        info: sandbox.stub(),
        debug: sandbox.stub(),
        error: sandbox.stub(),
      },
      env: {
        OPENAI_API_ENDPOINT: 'https://firefall.adobe.com/',
        OPENAI_API_KEY: 'test-api-key',
      },
    };
  });

  afterEach(() => {
    sandbox.restore();
    nock.cleanAll();
  });

  // it('should call Firefall API to get recommendations for a page', async () => {
  //   const message = { type: 'testType', auditResult: { siteId: 'Foo' } };
  //   const recommendation = { recommendations: ['Recommendation 1', 'Recommendation 2'] };
  //
  //   const nockScope = nock('https://firefall.adobe.com', {
  //     reqheaders: {
  //       'Content-Type': 'application/json',
  //       Authorization: 'Bearer test-api-key',
  //     },
  //   })
  //     .post('/')
  //     .reply(200, recommendation);
  //
  //   nockScope.on('request', (req, interceptor, body) => {
  //     console.log('Request was made:', req, interceptor, body);
  //   });
  //
  //   const response = await recommendations(message, contextMock);
  //
  //   expect(contextMock.log.info).to.have.been.calledWith('Fetching Audit Results for Foo');
  //   expect(contextMock.log.info).to.have.been.calledWith('Recommendations:', recommendation);
  //   expect(response).to.deep.equal(recommendation);
  // });

  it('should handle Firefall API response failure', async () => {
    const message = { type: 'mobile', auditResult: { siteId: '123' } };
    nock('https://firefall.adobe.com')
      .post('/endpoint')
      .reply(500, { error: 'Data access error' });

    await expect(recommendations(message, contextMock)).to.be.rejectedWith('Error getting recommendations from Firefall API');
  });
});
