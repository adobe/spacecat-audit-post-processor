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
import { main } from '../src/index.js';

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
        RUM_API_UBER_KEY: 'uber-key',
      },
    };
  });
  it('index function exists and successfully executes', async () => {
    const result = await main({}, context);
    assert.strictEqual(result.status, 200);
  });

  it('index function returns 404 for unknown audit type', async () => {
    context.invocation.event.Records[0].body = JSON.stringify({
      type: '404',
    });
    const result = await main({}, context);
    assert.strictEqual(result.status, 404);
  });

  it('index function returns 500 for ', async () => {
    context.invocation.event.Records[0].body = JSON.stringify({
      type: 'cwv',
      url: 'space.cat',
      auditResult: [],
    });
    const result = await main({}, context);
    assert.strictEqual(result.status, 500);
  });
});
