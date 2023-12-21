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
import chaiAsPromised from 'chai-as-promised';
import { context as h2 } from '@adobe/fetch';
import sinonChai from 'sinon-chai';
import { getRecommendations } from '../../src/firefall/handler.js';

chai.use(sinonChai);
chai.use(chaiAsPromised);
global.fetch = h2;
const { expect } = chai;

describe('getRecommendations', () => {
  let fetchStub;
  let logStub;
  let env;
  let prompt;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    logStub = {
      error: sinon.stub(console, 'error'),
    };
    env = {
      FIREFALL_API_ENDPOINT: 'https://valid.url',
      FIREFALL_IMS_ORG: 'org',
      FIREFALL_API_KEY: 'key',
      FIREFALL_API_AUTH: 'auth',
      SLACK_BOT_TOKEN: 'token',
    };
    prompt = 'prompt';
  });

  afterEach(() => {
    fetchStub.restore();
    logStub.error.restore();
  });

  it('should reject with error when data cannot be fetched from firefall', async () => {
    const error = new Error('Test error');
    fetchStub.rejects(error);
    const recommendations = await getRecommendations(env, prompt, logStub);
    expect(recommendations.status).to.equal(500);
    expect(logStub.error).to.be.calledWith('Unable to fetch Firefall data');
  });

  it('should return recommendations when data is fetched from firefall', async () => {
    const responseStub = {
      insights: [
        {
          insight: 'String',
          recommendation: 'String',
          code: 'String',
        },
      ],
    };
    fetchStub.resolves({
      ok: true,
      json: async () => ({ generations: [[{ text: JSON.stringify(responseStub) }]] }),
    });
    const recommendations = await getRecommendations(env, prompt, logStub);
    expect(recommendations).to.deep.equal(responseStub);
  });
});
