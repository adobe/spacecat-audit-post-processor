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
import secrets from '@adobe/helix-shared-secrets';
import wrap from '@adobe/helix-shared-wrap';
import { logger } from '@adobe/helix-universal-logger';
import { helixStatus } from '@adobe/helix-status';
import { log } from './util.js';
import SNSAuditClient from './sns-client.js';

/**
 * This is the main function
 * @param {Request} request the request object (see fetch api)
 * @param {UniversalContext} context the context of the universal serverless function
 * @returns {Response} a response
 */
async function run(request, context) {
  const message = JSON.parse(context.invocation.event.Records[0].body).message;
  log('error', `WITH PARSE: ${JSON.stringify(message)}`);
  const mobile = message.scores.mobile.performance;
  const desktop = message.scores.desktop.performance;
  const snsAuditClient = SNSAuditClient();

  if (mobile < 0.9 || desktop < 0.9) {
    await snsAuditClient.sendNotification('PERFORMANCE DEGRADATION DETECTED!!');
  }

  return new Response('SUCCESS');
}

export const main = wrap(run)
  .with(helixStatus)
  .with(logger.trace)
  .with(logger)
  .with(secrets);
