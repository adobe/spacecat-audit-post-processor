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
import { BaseSlackClient, SLACK_TARGETS } from '@adobe/spacecat-shared-slack-client';
import { convertToCSV } from '../support/utils.js';

import {
  markdown, section,
} from '../support/slack.js';

export function buildExperimentationSlackMessage(url, auditResult) {
  // Grouping objects based on the 'experiment id' field
  const groupedData = auditResult.reduce((acc, obj) => {
    const key = obj.experiment;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
  const blocks = [];
  blocks.push(section({
    text: markdown(`For *${url}*, ${Object.keys(groupedData).length} experiments have been run in the *last week*.\n More information is below :`),
  }));

  Object.entries(groupedData).forEach(([key, value]) => {
    const topLine = section({
      text: markdown(`:arrow-red2: * Experiment - ${key} *`),
    });
    blocks.push(topLine);

    const variantstats = [];
    for (let i = 0; i < Math.min(3, value.length); i += 1) {
      variantstats.push(markdown(`*Variant:* ${value[i].variant} | *Period:* ${value[i].time5} - ${value[i].time95} | *Events:* ${(value[i].variant_experimentations === null) ? 0 : value[i].variant_experimentations} | *Conversions:* ${(value[i].variant_conversions === null) ? 0 : value[i].variant_conversions} | *Confidence:* ${(value[i].p_value === null) ? 0 : value[i].p_value} | *Conversion Rate:* ${(value[i].variant_conversion_rate === 0) ? 0 : value[i].variant_conversion_rate}`));
    }
    const stats = section({
      fields: variantstats,
    });
    blocks.push(stats);
  });
  return blocks;
}

export function isValidMessage(message) {
  return hasText(message.url)
    && hasText(message.auditContext?.slackContext?.channel)
    && Array.isArray(message.auditResult?.result)
    && Object.values(message.auditResult?.result).every((result) => isObject(result));
}

export default async function experimentationHandler(message, context) {
  const { log } = context;
  const { url, auditResult, auditContext } = message;
  const target = SLACK_TARGETS.WORKSPACE_INTERNAL;

  const slackClient = BaseSlackClient.createFrom(context, target);
  if (!isValidMessage(message)) {
    const msg = 'Required parameters missing in the message or no experimentation data available';
    log.info(msg);
    return badRequest(msg);
  }

  const { result } = auditResult;
  if (result.length === 0) {
    log.info(`No experimentation data available for ${auditResult.finalUrl}`);
    return noContent();
  }
  const urlWithProtocolStripped = url?.replace(/^(https?:\/\/)/, '');
  const urlWithDotsAndSlashesReplaced = urlWithProtocolStripped?.replace(/\./g, '-')?.replace(/\//g, '-');
  const fileName = `Experiments - ${urlWithDotsAndSlashesReplaced}-${new Date().toISOString().split('T')[0]}.csv`;
  const textMsg = `For *${urlWithProtocolStripped}*, the following CSV file contains a detailed report for all experiments:`;
  const csvData = convertToCSV(result);
  // const csvFile = new Blob([csvData], { type: 'text/csv' });
  log.info(`Converted to csv ${csvData}`);

  try {
    const { channel, ts } = auditContext.slackContext;
    // send alert to the slack channel - group under a thread if ts value exists
    const slackMessage = buildExperimentationSlackMessage(urlWithProtocolStripped, result);
    await slackClient.postMessage({
      channel,
      thread_ts: ts,
      blocks: slackMessage,
    });
    await slackClient.fileUpload({
      channels: channel,
      thread_ts: ts,
      content: csvData.toString(),
      filename: fileName,
      initial_comment: textMsg,
    });
    log.info(`Successfully reported experiment details for ${url}`);
  } catch (e) {
    log.error(`Failed to send slack message to report experimentations done for ${url}. Reason :${e.message}`);
  }

  return noContent();
}
