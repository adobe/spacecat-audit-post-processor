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

import { badRequest, internalServerError, noContent } from '@adobe/spacecat-shared-http-utils';
import { hasText, isArray, isObject } from '@adobe/spacecat-shared-utils';
import {
  markdown, postSlackMessage, section, uploadSlackFile,
} from '../support/slack.js';

function convertToCSV(array) {
  let csvStr = '';

  // Extract headers
  if (array.length > 0) {
    csvStr += `${Object.keys(array[0]).join(',')}\r\n`;
  }

  // Extract content
  array.forEach((item) => {
    const line = Object.keys(item).map((key) => {
      let value = item[key];
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      return `"${value}"`;
    }).join(',');

    csvStr += `${line}\r\n`;
  });

  return csvStr;
}

function buildSlackMessage(url, fileUrl, fileName, auditResult) {
  const blocks = [];

  blocks.push((section({
    text: markdown(`For *${url}*, ${auditResult.broken_backlinks.length} broken backlink(s) were detected.`),
  })));

  blocks.push((section({
    text: markdown(`The following CSV file contains a detailed report for all broken backlinks: <${fileUrl}|${fileName}>.`),
  })));

  return blocks;
}
function isValidMessage(message) {
  return hasText(message.url)
    && isArray(message.auditResult?.broken_backlinks)
    && isObject(message.auditContext?.slackContext);
}

export default async function brokenBacklinksHandler(message, context) {
  const { log } = context;
  const { url, auditResult, auditContext } = message;
  const { env: { SLACK_BOT_TOKEN: token } } = context;

  if (!isValidMessage(message)) {
    return badRequest('Required parameters missing in the message.');
  }
  const { brokenBacklinks } = auditResult;

  if (brokenBacklinks.length === 0) {
    log.info(`No broken backlinks detected for ${url}`);
    return noContent();
  }

  const { channel, ts } = auditContext.slackContext;

  const csvData = convertToCSV(brokenBacklinks);
  const file = new Blob([csvData], { type: 'text/csv' });

  try {
    const fileName = `broken-backlinks-${url.replace(/\./g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    const { fileUrl } = await uploadSlackFile(token, {
      file, fileName, channel,
    });

    await postSlackMessage(token, {
      blocks: buildSlackMessage(url, fileUrl, fileName, auditResult),
      channel,
      ts,
    });
  } catch (e) {
    log.error(`Failed to send slack message to report broken backlinks for ${url}. Reason: ${e.message}`);
    return internalServerError(`Failed to send slack message to report broken backlinks for ${url}`);
  }

  log.info(`Successfully reported broken backlinks for ${url}`);
  return noContent();
}
