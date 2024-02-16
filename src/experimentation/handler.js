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
  const blocks = [];
  blocks.push(section({
    text: markdown(`For *${url}*, ${auditResult.length} experiments have been run in the *last week*.\n More information is below :`),
  }));
  for (let i = 0; i < Math.min(3, auditResult.length); i += 1) {
    const topLine = section({
      text: markdown(`:arrow-red2: * Experiment - ${auditResult[i].experiment}| Period - ${auditResult[i].time5} to ${auditResult[i].time95} | Confidence - ${auditResult[i].p_value} | Events - ${auditResult[i].variant_experimentations} | Conversion - ${auditResult[i].variant_conversions} | Conversion Rate - ${auditResult[i].variant_conversion_rate} *`),
    });
    blocks.push(topLine);
  }
  return blocks;
}

export function isValidMessage(message) {
  return hasText(message.url)
    && Array.isArray(message.auditResult?.result)
    && Object.values(message.auditResult?.result).every((result) => isObject(result));
}

export default async function experimentationHandler(message, context) {
  const { log } = context;
  const { url, auditResult } = message;
  const { SLACK_OPS_CHANNEL_WORKSPACE_INTERNAL: slackChannel } = context.env;
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

  const csvData = convertToCSV(result);
  log.info(`Converted to csv ${csvData}`);
  const csvFile = new Blob([csvData], { type: 'text/csv' });

  try {
    const slackMessage1 = `\nFor *${url}*, ${result.length} experiment(s) were detected.\nThe following CSV file contains a detailed report for all experiments:`;
    // send alert to the slack channel - group under a thread if ts value exists
    const slackMessage2 = buildExperimentationSlackMessage(url, result);
    await slackClient.postMessage({
      channel: slackChannel,
      text: slackMessage1,
    });
    await slackClient.postMessage({
      channel: slackChannel,
      text: slackMessage2,
    });
    await slackClient.fileUpload({
      file: csvFile,
    });
    log.info(`Successfully reported experiment details for ${url}`);
  } catch (e) {
    log.error(`Failed to send slack message to report experimentations done for ${url}. Reason :${e.message}`);
  }

  return noContent();
}
