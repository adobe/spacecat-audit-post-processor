/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { hasText, isArray } from '@adobe/spacecat-shared-utils';
import { badRequest, internalServerError, noContent } from '@adobe/spacecat-shared-http-utils';
import { markdown, postSlackMessage, section } from '../support/slack.js';

function buildSlackMessage(results) {
  const blocks = [];
  const [firstResult, secondResult] = results.sort((a, b) => b.success - a.success);

  const informativePart = firstResult.success
    ? `One of your domains is encountering difficulties. While requests to *<${firstResult.url}|${firstResult.url}>* are successful :checked:, those to *<${secondResult.url}|${secondResult.url}>* fail :red:.`
    : `Your domains are encountering difficulties. Requests to both *<${firstResult.url}|${firstResult.url}>* and *<${secondResult.url}|${secondResult.url}>* *fail* :red:`;

  blocks.push(section({ text: markdown(informativePart) }));

  blocks.push(section({
    text: markdown('Please verify and adjust the redirection settings as per your requirements. Delay in resolving this issue could result in SEO repercussions, potentially leading to a decrease in organic traffic. Prompt action is advised to mitigate this risk.'),
  }));

  return blocks;
}

function isValidMessage(message) {
  return hasText(message.url)
    && hasText(message.auditContext?.slackContext?.channel)
    && isArray(message.auditResult)
    && message.auditResult.length === 2
    && message.auditResult.every((result) => 'success' in result && hasText(result.url));
}

export default async function apexHandler(message, context) {
  const { log } = context;
  const { url, auditResult, auditContext } = message;
  const { env: { SLACK_BOT_TOKEN: token } } = context;

  if (!isValidMessage(message)) {
    const msg = 'Required parameters missing in the message body';
    log.info(msg);
    return badRequest(msg);
  }

  if (auditResult.every((result) => result.success)) {
    log.info(`Apex audit was successful for ${url}. Won't notify.`);
    return noContent();
  }

  const { channel, ts } = auditContext.slackContext;

  try {
    // send alert to the slack channel - group under a thread if ts value exists
    await postSlackMessage(token, {
      blocks: buildSlackMessage(auditResult),
      channel,
      ts,
    });
  } catch (e) {
    log.error(`Failed to send Slack message for ${url}. Reason: ${e.message}`);
    return internalServerError(`Failed to send Slack message for ${url}`);
  }

  log.info(`Slack notification sent for ${url}`);

  return noContent();
}
