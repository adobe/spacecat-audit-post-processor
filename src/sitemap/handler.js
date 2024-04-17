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

export function buildSlackMessage({ url, reasons }) {
  const blocks = [];

  const informativePart = `Unable to process sitemap for ${url}:`;
  blocks.push(section({ text: markdown(informativePart) }));
  blocks.push(section({
    text: markdown(`|link|reason|\n|---|---|\n${reasons.map((reason) => `|${reason.value}|${reason.error}|\n`)}`),
  }));
  blocks.push(section({
    text: markdown('Please ensure your sitemap is properly defined and accessible.'),
  }));

  return blocks;
}

export function isValidMessage(message) {
  return hasText(message.url)
    && hasText(message.auditContext?.slackContext?.channel)
    && (
      (message.auditResult.success && hasText(message.auditResult.url))
      || (!message.auditResult.success
        && isArray(message.auditResult.reasons)
        && message.auditResult.reasons.length > 0)
    );
}

export default async function sitemapHandler(message, context) {
  const { log } = context;
  const { url, auditResult, auditContext } = message;
  const { env: { SLACK_BOT_TOKEN: token } } = context;

  if (!isValidMessage(message)) {
    const msg = 'Required parameters missing in the message body';
    log.info(msg);
    return badRequest(msg);
  }

  if (auditResult.success) {
    log.info(`Sitemap audit was successful for ${url}. Won't notify.`);
    return noContent();
  }

  const { channel, ts } = auditContext.slackContext;

  try {
    // send alert to the slack channel - group under a thread if ts value exists
    await postSlackMessage(token, {
      blocks: buildSlackMessage({
        url,
        reasons: auditResult.reasons,
      }),
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
