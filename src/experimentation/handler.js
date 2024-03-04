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
    const numOfVariants = value.length;
    const duration = (date1, date2) => Math.abs(date2 - date1) / (1000 * 60 * 60 * 24);
    const variantDuration = [];
    const variantConfidence = [];
    let totalVariantConversions = 0;
    let totalVariantExperimentations = 0;
    for (let i = 0; i < value.length; i += 1) {
      const time95 = new Date(value[i].time95);
      const time5 = new Date(value[i].time5);
      variantDuration.push(duration(time95, time5));
      variantConfidence.push({ vName: value[i].variant, vConfidence: value[i].p_value });
      const vConversions = Number(value[i].variant_conversions);
      const vExperimentations = Number(value[i].variant_experimentations);
      totalVariantConversions += vConversions;
      totalVariantExperimentations += vExperimentations;
    }
    variantConfidence.sort((a, b) => b.vConfidence - a.vConfidence);
    const expDuration = Math.max(...variantDuration);
    const topLine = section({
      text: markdown(`:arrow-red2: The Experiment ${key} has been running for ${expDuration} days with ${numOfVariants} variants.`),
    });
    blocks.push(topLine);
    const countformat = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 });
    const bigcountformat = {
      format: (number) => {
        if (number > 1000000) {
          return `${countformat.format(number / 1000000)}M`;
        }
        if (number > 1000) {
          return `${countformat.format(number / 1000)}K`;
        }
        return countformat.format(number);
      },
    };
    const summary = () => {
      if (totalVariantConversions < 500 && variantConfidence[0].vConfidence > 0.05) {
        return markdown(`Not yet enough data to determine a winner. Keep going until you get ${bigcountformat.format((500 * totalVariantExperimentations) / totalVariantConversions)} visits.`);
      } else if (variantConfidence[0].vConfidence > 0.05) {
        return markdown('No significant difference between variants. In doubt, stick with *control*');
      } else if (variantConfidence[0].vName === 'control') {
        return markdown('Stick with *control*. No variant is better than the control.');
      } else {
        return markdown(`${variantConfidence[0].vName} is the winner.`);
      }
    };

    const score = (confidence) => {
      if (confidence < 0.005) {
        return `${confidence} is *highly significant*`;
      }
      if (confidence < 0.05) {
        return `${confidence} is *significant*`;
      }
      if (confidence < 0.1) {
        return `${confidence} is *marginally significant*`;
      }
      return `${confidence} is *not significant*`;
    };
    const variantstats = [];
    for (let i = 0; i < value.length; i += 1) {
      variantstats.push(markdown(`The *Variant:* ${value[i].variant} shows a conversion rate of ${(value[i].variant_conversion_rate === null) ? 0 : (value[i].variant_conversion_rate * 100)} %. The statistical confidence ${(value[i].p_value === null) ? 0 : score(value[i].p_value)}`));
    }
    const stats = section({
      fields: variantstats,
    });
    blocks.push(stats);
    const expSummary = section({
      fields: summary(),
    });
    blocks.push(expSummary);
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
  const textMsg = 'The following CSV file contains a detailed report for all related experiments:';
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
