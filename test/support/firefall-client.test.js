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
import { h1 } from '@adobe/fetch';
import FirefallClient from '../../src/support/firefall-client.js';

const { expect } = chai;
global.fetch = h1;

describe('FirefallClient', () => {
  let fetchStub;
  let logStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    logStub = {
      error: sinon.stub(console, 'error'),
    };
  });

  afterEach(() => {
    fetchStub.restore();
    logStub.error.restore();
  });

  it('should return null and log error if API endpoint is not valid', async () => {
    const client = FirefallClient('invalid-url', 'key', 'auth', 'org');
    const result = await client.fetchFirefallData('Foo Bar');
    expect(result).to.be.null;
    expect(logStub.error.calledOnce).to.be.true;
    expect(logStub.error.calledWith('Firefall API Endpoint is not valid: invalid-url')).to.be.true;
  });

  it('should return null and log error if prompt is not a string', async () => {
    const client = FirefallClient('https://valid.url', 'key', 'auth', 'org');
    const result = await client.fetchFirefallData(123);
    expect(result).to.be.null;
    expect(logStub.error.calledOnce).to.be.true;
    expect(logStub.error.calledWith('Invalid prompt provieded for Firefall.')).to.be.true;
  });

  it('should fetch data from Firefall API and return parsed response', async () => {
    const client = FirefallClient('http://valid.url', 'key', 'auth', 'org');
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
      json: async () => ({
        generations: [[{
          text: JSON.stringify(responseStub),
        }]],
      }),
    });
    const result = await client.fetchFirefallData('prompt');
    expect(result).to.deep.equal(responseStub);
    expect(fetchStub.calledOnce).to.be.true;
  });

  it('should return null and log error if fetching returns something other than 200 response', async () => {
    const client = FirefallClient('http://valid.url', 'key', 'auth', 'org');
    const statusText = 'Test Error';
    fetchStub.resolves({
      ok: false,
      statusText,
    });
    const result = await client.fetchFirefallData('prompt');
    expect(result).to.be.null;
    expect(logStub.error.calledOnce).to.be.true;
    expect(logStub.error.calledWith(`Could not obtain data from Firefall: ${statusText}`)).to.be.true;
  });

  it('should return null and log error if fetching data fails', async () => {
    const client = FirefallClient('http://valid.url', 'key', 'auth', 'org');
    const error = new Error('Test error');
    fetchStub.rejects(error);
    const result = await client.fetchFirefallData('prompt');
    expect(result).to.be.null;
    expect(logStub.error.calledOnce).to.be.true;
    expect(logStub.error.calledWith('Error while fetching data from Firefall API, using endpoint: http://valid.url:', error.message)).to.be.true;
  });

  it('should return null and log error if response does not contain generations object', async () => {
    const client = FirefallClient('http://valid.url', 'key', 'auth', 'org');
    fetchStub.resolves({
      ok: true,
      json: async () => ({
        foo: 'bar',
      }),
    });
    const result = await client.fetchFirefallData('prompt');
    expect(result).to.be.null;
    expect(logStub.error.calledWith('Could not obtain data from Firefall: Generations object is missing.')).to.be.true;
  });

  it('should return null and log error if response does not contain insights object', async () => {
    const client = FirefallClient('http://valid.url', 'key', 'auth', 'org');
    fetchStub.resolves({
      ok: true,
      json: async () => ({
        generations: [[{
          text: '{ "foo": "bar" }',
        }]],
      }),
    });
    const result = await client.fetchFirefallData('prompt');
    expect(result).to.be.null;
    expect(logStub.error.calledWith('Could not obtain data from Firefall: Invalid response format.')).to.be.true;
  });

  it('should return null and log error if response from Firefall is not a json object', async () => {
    const client = FirefallClient('http://valid.url', 'key', 'auth', 'org');
    fetchStub.resolves({
      ok: true,
      json: async () => ({
        generations: [[{
          text: 'foo',
        }]],
      }),
    });
    const result = await client.fetchFirefallData('prompt');
    expect(result).to.be.null;
    expect(logStub.error.calledWith('Returned Data from Firefall is not a JSON object.')).to.be.true;
  });
});
