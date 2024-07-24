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
import wrap from '@adobe/helix-shared-wrap';
import { hasText, resolveSecretsName, sqsEventAdapter } from '@adobe/spacecat-shared-utils';
import { internalServerError, notFound } from '@adobe/spacecat-shared-http-utils';
import { helixStatus } from '@adobe/helix-status';
import secrets from '@adobe/helix-shared-secrets';
import dataAccess from '@adobe/spacecat-shared-data-access';
import apex from './apex/handler.js';
import sitemap from './sitemap/handler.js';
import noopHandler from './digest/handler-noop.js';
import lhsHandler from './lhs/handler.js';

export const HANDLERS = {
  apex,
  cwv: noopHandler,
  sitemap,
  404: noopHandler,
  'broken-backlinks': noopHandler,
  experimentation: noopHandler,
  'lhs-desktop': lhsHandler,
  'lhs-mobile': lhsHandler,
};

function guardEnvironmentVariables(fn) {
  const variables = ['SLACK_BOT_TOKEN', 'RUM_DOMAIN_KEY'];
  return async (req, context) => (variables.every((v) => hasText(context.env[v])) ? fn(req, context) : internalServerError('Missing configuration'));
}

/**
 * Processes an audit result message received from SQS and sends notifications to specified
 * outlets such as slack.
 * @param {object} message - The audit result message received from SQS.
 * @param {UniversalContext} context - The universal AWS context from Helix.
 * @returns {Promise<Response>} - Result of the post process
 *
 */
async function run(message, context) {
  const { log } = context;
  const {
    type,
    url,
  } = message;

  if (url) {
    log.info(`Audit result received for url: ${url}\nmessage content: ${JSON.stringify(message)}`);
  }

  const handler = HANDLERS[type];
  if (!handler) {
    const msg = `No handler found for the type: ${type}`;
    log.info(msg);
    return notFound(msg);
  }

  const t0 = Date.now();

  try {
    return await handler(message, context);
  } catch (e) {
    const t1 = Date.now();
    log.error(`handler exception after ${t1 - t0}ms`, e);
    return internalServerError();
  }
}

export const main = wrap(run)
  .with(dataAccess)
  .with(sqsEventAdapter)
  .with(guardEnvironmentVariables)
  .with(secrets, { name: resolveSecretsName })
  .with(helixStatus);
