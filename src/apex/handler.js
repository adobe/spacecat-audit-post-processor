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
  const sorted = results.sort((a, b) => b.success - a.success);

  // results array always has two element all the time - verified at the beginning of the handler
  const informativePart = !sorted[0].success
    ? `Your domains are experiencing issues. Requests to both *<${sorted[0].url}|${sorted[0].url}>* and *<${sorted[1].url}|${sorted[1].url}>* *fail*`
    : `One of your domains is experiencing issues. Requests to *<${sorted[0].url}|${sorted[0].url}>* work, but *fail* for *<${sorted[1].url}|${sorted[1].url}>*`;

  blocks.push(section({
    text: markdown(`${informativePart}. Confirm redirection settings according to your preference.`),
  }));

  blocks.push(section({
    text: markdown('Failure to address this promptly may lead to SEO implications. Act swiftly to prevent possible loss of organic traffic.'),
  }));

  return blocks;
}

function isValidMessage(message) {
  return hasText(message.url)
    && hasText(message.auditContext?.slackContext?.channel)
    && isArray(message.auditResult)
    && message.auditResult.length === 2;
}

export default async function apexHandler(message, context) {
  const { log } = context;
  const { url, auditResult, auditContext } = message;
  const { env: { SLACK_BOT_TOKEN: token } } = context;

  if (!isValidMessage(message)) {
    const msg = 'Required parameters missing in the message body';
    log.info(msg);
    log.info(`type of: ${typeof message.auditResult?.success}`);
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
