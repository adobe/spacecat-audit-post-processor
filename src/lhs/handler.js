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

import {
  hasText, isObject, isString, toBoolean,
} from '@adobe/spacecat-shared-utils';
import { badRequest, internalServerError, noContent } from '@adobe/spacecat-shared-http-utils';
import { getRecommendations } from '../firefall/handler.js';
import { postSlackMessage } from '../support/slack.js';
import { getPrompt } from '../support/utils.js';
import { buildSlackMessage, getLHSData } from './firefall-utils.js';

const THRESHOLD = 0.9;

function isValidMessage(message) {
  return hasText(message.url)
    && hasText(message.auditContext?.slackContext?.channel)
    && hasText(message.auditResult?.siteId)
    && isObject(message.auditResult?.scores);
}

export default async function lhsHandler(message, context) {
  const { dataAccess, log } = context;
  const {
    type,
    url,
    auditResult,
    auditContext,
  } = message;
  const {
    env: {
      SLACK_BOT_TOKEN: slackToken, FIREFALL_INTEGRATION_ENABLED: firefallIntegrationEnabled = 'false',
    },
  } = context;

  if (!isValidMessage(message)) {
    return badRequest('Required parameters missing in the message body');
  }

  const { siteId } = auditResult;
  const { channel, ts } = auditContext.slackContext;

  if (Object.values(auditResult.scores).every((score) => score >= THRESHOLD)) {
    log.info(`All LHS values from ${url} are above ${THRESHOLD * 100}, not posting to Slack`);
    return noContent();
  }

  if (!toBoolean(firefallIntegrationEnabled)) {
    log.info('Firefall integration disabled, skipping message', message);
    return noContent();
  }
  log.info('Firefall integration enabled, processing message', message);

  const lhsData = await getLHSData(type, siteId, dataAccess, log);
  const prompt = await getPrompt(lhsData);

  if (!isString(prompt)) {
    log.error('Prompt is not available');
    return internalServerError('Prompt for Firefall is not available.');
  }

  const data = await getRecommendations(context.env, prompt, log);
  const blocks = buildSlackMessage(url, data, lhsData.scoresBefore, lhsData.scoresAfter);

  try {
    await postSlackMessage(slackToken, {
      blocks,
      channel,
      ts,
    });
  } catch (e) {
    log.error(`Failed to send Slack message for ${url}. Reason: ${e.message}`);
    return internalServerError(`Failed to send Slack message for ${url}`);
  }

  log.info(`Slack notification sent for ${url} to ${channel} in thread ${ts}`);

  return noContent();
}
