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
import { convertToCSV } from '../support/utils.js';
import { uploadSlackFile } from '../support/slack.js';

function isValidMessage(message) {
  return hasText(message.url)
    && isObject(message.auditContext?.slackContext)
    && isObject(message.auditResult);
}
export default async function organicKeywordsHandler(message, context) {
  const { log } = context;
  const { auditResult, auditContext, url } = message;
  const { env: { SLACK_BOT_TOKEN: token } } = context;

  if (!isValidMessage(message)) {
    return badRequest('Required parameters missing in the message.');
  }

  const { keywords } = auditResult;
  if (!keywords || keywords.length === 0) {
    log.info(`${url} does not have any organic keywords.`);
    return noContent();
  }

  const {
    increasedPositions,
    decreasedPositions,
    keywordsReadable,
  } = keywords.reduce((acc, keyword) => {
    const item = { ...keyword };
    item.best_position_diff = item.best_position_diff || 'New';
    if (item.best_position_diff < 0) acc.increasedPositions += 1;
    else if (item.best_position_diff > 0) acc.decreasedPositions += 1;
    acc.keywordsReadable.push(item);
    return acc;
  }, { increasedPositions: 0, decreasedPositions: 0, keywordsReadable: [] });

  const csvData = convertToCSV(keywordsReadable);
  const file = new Blob([csvData], { type: 'text/csv' });

  try {
    const { channel, ts } = auditContext.slackContext;
    const fileName = `organic-keywords-${url.split('://')[1]?.replace(/\./g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    const text = `Organic Keywords report for *${url.split('://')[1]}*. There are a total of ${increasedPositions} keywords that rank higher and ${decreasedPositions} keywords thar rank lower than the previous month.`;
    await uploadSlackFile(token, {
      file, fileName, channel, ts, text,
    });
  } catch (e) {
    log.error(`Failed to send slack message to report organic keywords for ${url}: ${e.message}`);
  }

  return noContent();
}
