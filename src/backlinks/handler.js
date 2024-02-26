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

import { badRequest, noContent } from '@adobe/spacecat-shared-http-utils';
import { hasText, isObject } from '@adobe/spacecat-shared-utils';
import { uploadSlackFile } from '../support/slack.js';
import { convertToCSV } from '../support/utils.js';

function isValidMessage(message) {
  return hasText(message.url)
    && isObject(message.auditContext?.slackContext)
    && isObject(message.auditResult);
}

export default async function brokenBacklinksHandler(message, context) {
  const { log } = context;
  const { auditResult, auditContext } = message;
  const { env: { SLACK_BOT_TOKEN: token } } = context;

  if (!isValidMessage(message)) {
    return badRequest('Required parameters missing in the message.');
  }

  const { finalUrl, brokenBacklinks, error } = auditResult;

  if (error) {
    log.warn(`Not reporting broken backlinks: ${error}`);
    return noContent();
  }

  if (!brokenBacklinks || brokenBacklinks.length === 0) {
    log.info(`No broken backlinks detected for ${finalUrl}`);
    return noContent();
  }

  const { channel, ts } = auditContext.slackContext;

  const csvData = convertToCSV(brokenBacklinks);
  log.info(`Converted to csv ${csvData}`);
  const file = new Blob([csvData], { type: 'text/csv' });

  try {
    const urlWithProtocolStripped = finalUrl?.replace(/^(https?:\/\/)/, '');
    const urlWithDotsAndSlashesReplaced = urlWithProtocolStripped?.replace(/\./g, '-')?.replace(/\//g, '-');
    const fileName = `broken-backlinks-${urlWithDotsAndSlashesReplaced}-${new Date().toISOString().split('T')[0]}.csv`;
    const text = `For *${urlWithProtocolStripped}*, ${brokenBacklinks?.length} broken backlink(s) were detected.\nThe following CSV file contains a detailed report for all broken backlinks:`;
    await uploadSlackFile(token, {
      file, fileName, channel, ts, text,
    });

    log.info(`Successfully reported broken backlinks for ${finalUrl}`);
  } catch (e) {
    log.error(`Failed to send slack message to report broken backlinks for ${finalUrl}. Reason: ${e.message}`);
  }

  return noContent();
}
