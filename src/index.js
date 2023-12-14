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
import wrap from '@adobe/helix-shared-wrap';
import { helixStatus } from '@adobe/helix-status';
import secrets from '@adobe/helix-shared-secrets';
import dataAccess from '@adobe/spacecat-shared-data-access';
import { toBoolean, resolveSecretsName } from '@adobe/spacecat-shared-utils';

import { getRecommendations } from './firefall/handler.js';

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
      return new Response('', {
        status: 400,
        headers: {
          'x-error': 'Event does not contain a valid message body',
        },
      });
    }
    return fn(message, context);
  };
}

/**
 * This is the main function
 * @param {object} message the message object received from SQS
 * @param {UniversalContext} context the context of the universal serverless function
 * @returns {Response} a response
 */
async function run(message, context) {
  const { log } = context;
  const {
    FIREFALL_INTEGRATION_ENABLED: firefallIntegrationEnabled,
  } = context.env;

  if (toBoolean(firefallIntegrationEnabled)) {
    log.info('Firefall integration enabled, processing message', message);
    return getRecommendations(message, context);
  }

  log.info('Firefall integration disabled, skipping message', message);
  return new Response('', {
    status: 200,
  });
}

export const main = wrap(run)
  .with(dataAccess)
  .with(sqsEventAdapter)
  .with(secrets, { name: resolveSecretsName })
  .with(helixStatus);
