/*
 * Copyright 2021 Adobe. All rights reserved.
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

import assert from 'assert';
import sinon from 'sinon';
import { main, HANDLERS } from '../src/index.js';

const sandbox = sinon.createSandbox();

describe('Index Tests', () => {
  let context;
  beforeEach('setup', () => {
    context = {
      invocation:
          {
            event: {
              Records: [
                {
                  messageId: 'message-1',
                  body: JSON.stringify({
                    type: 'cwv',
                    url: 'space.cat',
                    auditContext: {
                      finalUrl: 'www.space.cat',
                      slackContext: {
                        channel: 'channel-id',
                        ts: 'thread-id',
                      },
                    },
                    auditResult: [],
                  }),
                },
              ],
            },
          },
      log: console,
      env: {
        SLACK_BOT_TOKEN: 'token',
        RUM_DOMAIN_KEY: 'uber-key',
        FIREFALL_INTEGRATION_ENABLED: 'false',
      },
    };
  });

  afterEach(() => {
    sandbox.restore();
  });
  it('index function exists and successfully executes', async () => {
    const result = await main({}, context);
    assert.strictEqual(result.status, 204);
  });

  it('index function returns 404 for unknown audit type', async () => {
    context.invocation.event.Records[0].body = JSON.stringify({
      type: '404',
    });
    const result = await main({}, context);
    assert.strictEqual(result.status, 404);
  });

  it('index function returns 400 for an invalid message body', async () => {
    context.invocation.event.Records[0].body = 'invalid-body';
    const result = await main({}, context);
    assert.strictEqual(result.status, 400);
  });

  it('index function returns 500 when a required env variable is missing', async () => {
    delete context.env.SLACK_BOT_TOKEN;
    const result = await main({}, context);
    assert.strictEqual(result.status, 500);
  });

  it('index function returns 500 when a handler fails', async () => {
    sinon.stub(HANDLERS, 'cwv').throws(new Error('Test error'));

    const result = await main({}, context);
    assert.strictEqual(result.status, 500);
    HANDLERS.cwv.restore();
  });

  it('obtains recommendations from firefall if integration is enabled', async () => {
    context.env.FIREFALL_INTEGRATION_ENABLED = 'true';
    const logStub = sandbox.stub(console, 'info');
    await main({}, context);
    assert.strictEqual(logStub.calledWithMatch('Firefall integration enabled, processing message'), true);
  });

  it('does not obtains recommendations from firefall if integration is disabled', async () => {
    const logStub = sandbox.stub(console, 'info');
    await main({}, context);
    assert.strictEqual(logStub.calledWithMatch('Firefall integration disabled, skipping message'), true);
  });
});
