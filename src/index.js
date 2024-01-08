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
import { hasText, resolveSecretsName } from '@adobe/spacecat-shared-utils';
import { badRequest, internalServerError, notFound } from '@adobe/spacecat-shared-http-utils';
import { helixStatus } from '@adobe/helix-status';
import secrets from '@adobe/helix-shared-secrets';
import dataAccess from '@adobe/spacecat-shared-data-access';
import cwv from './cwv/handler.js';
import lhs from './lhs/handler.js';
import notFoundHandler from './notfound/handler.js';

export const HANDLERS = {
  cwv,
  lhs,
  404: notFoundHandler,
};

function guardEnvironmentVariables(fn) {
  const variables = ['SLACK_BOT_TOKEN', 'RUM_DOMAIN_KEY'];
  return async (req, context) => (variables.every((v) => hasText(context.env[v])) ? fn(req, context) : internalServerError('Missing configuration'));
}

/**
 * Wrapper to turn an SQS record into a function param
 * Inspired by https://github.com/adobe/helix-admin/blob/main/src/index.js#L104C1-L128C5
 *
 * @param {UniversalAction} fn
 * @returns {function(object, UniversalContext): Promise<Response>}
 */
function sqsEventAdapter(fn) {
  return async (req, context) => {
    const { log } = context;
    let message;

    try {
      // currently not publishing batch messages
      const records = context.invocation?.event?.Records;
      log.info(`Received ${records.length} many records. ID of the first message in the batch: ${records[0]?.messageId}`);
      message = JSON.parse(records[0]?.body);
      log.info(`Received message with id: ${context.invocation?.event?.Records.length}`);
    } catch (e) {
      log.error('Function was not invoked properly, message body is not a valid JSON', e);
      return badRequest('Event does not contain a valid message body');
    }
    return fn(message, context);
  };
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

  log.info(`Audit result received for url: ${url}\nmessage content: ${JSON.stringify(message)}`);

  const handler = HANDLERS[type];
  if (!handler) {
    const msg = `no such audit type: ${type}`;
    log.error(msg);
    return notFound();
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
