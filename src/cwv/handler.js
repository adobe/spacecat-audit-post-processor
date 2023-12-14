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

import RUMAPIClient from '@adobe/spacecat-shared-rum-api-client';
import { hasText, isArray } from '@adobe/spacecat-shared-utils';
import { badRequest, noContent } from '@adobe/spacecat-shared-http-utils';
import humanFormat from 'human-format';
import commaNumber from 'comma-number';
import { markdown, postSlackMessage, section } from '../support/slack.js';

const COLOR_EMOJIS = {
  gray: ':gray-circle:',
  green: ':green:',
  red: ':red:',
  yellow: ':yellow:',
};

const SCORES = {
  lcp: { 0: COLOR_EMOJIS.green, 2500: COLOR_EMOJIS.yellow, 4000: COLOR_EMOJIS.red },
  cls: { 0: COLOR_EMOJIS.green, 0.1: COLOR_EMOJIS.yellow, 0.25: COLOR_EMOJIS.red },
  inp: { 0: COLOR_EMOJIS.green, 200: COLOR_EMOJIS.yellow, 500: COLOR_EMOJIS.red },
};

const BACKLINK_EXPIRY_DAYS = 7;

const timeScale = new humanFormat.Scale({ ms: 1, s: 1000 });

export function getColorEmoji(type, value) {
  const scores = SCORES[type];
  if (!scores) return COLOR_EMOJIS.gray;
  const pair = Object.entries(scores).reverse()
    .find((e) => Number.isFinite(value) && value >= e[0]);
  return pair ? pair[1] : COLOR_EMOJIS.gray;
}

function buildSlackMessage(url, overThreshold, backlink) {
  const blocks = [];

  blocks.push(section({
    text: markdown(`For *${url}*, ${overThreshold.length} page(s) had CWV over threshold in the *last week* for the real users.\n More information is below (up to three pages):`),
  }));

  for (let i = 0; i < Math.min(3, overThreshold.length); i += 1) {
    const topLine = section({
      text: markdown(`:arrow-green: *<${overThreshold[i].url}|${overThreshold[i].url}>*`),
    });

    const stats = section({
      fields: [
        markdown(`:mag: *Pageviews:* ${commaNumber(overThreshold[i].pageviews)}`),
        markdown(`${getColorEmoji('lcp', overThreshold[i].avglcp)} *LCP:* ${humanFormat(overThreshold[i].avglcp, { scale: timeScale })}`),
        markdown(`${getColorEmoji('cls', overThreshold[i].avgcls)} *CLS:* ${overThreshold[i].avgcls}`),
        markdown(`${getColorEmoji('inp', overThreshold[i].avginp)} *INP:* ${overThreshold[i].avginp === null ? 0 : overThreshold[i].avginp} ms`),
      ],
    });

    blocks.push(topLine);
    blocks.push(stats);
  }

  if (backlink) {
    blocks.push(section({
      text: markdown(`*To access the full report <${backlink}|click here> :link:* _(expires in 7 days)_`),
    }));
  }

  return blocks;
}

async function getBacklink(context, url) {
  try {
    const rumApiClient = RUMAPIClient.createFrom(context);
    return await rumApiClient.createBacklink(url, BACKLINK_EXPIRY_DAYS);
  } catch (e) {
    context.log.info(`Failed to get a backlink for ${url}`);
    return null;
  }
}

function isValidMessage(message) {
  return hasText(message.url)
    && hasText(message.auditContext?.finalUrl)
    && hasText(message.auditContext?.slackContext?.channel)
    && isArray(message.auditResult);
}

export default async function cwvHandler(message, context) {
  const { log } = context;
  const { url, auditResult, auditContext } = message;
  const { env: { SLACK_BOT_TOKEN: token } } = context;

  if (!isValidMessage(message)) {
    return badRequest('Required parameters missing in the message body');
  }

  // filter out the audit results values of which are considered good core web vitals
  const overThreshold = auditResult
    .filter((result) => result.avglcp > 2500 || result.avgcls > 0.1 || result.avginp > 200);

  // if all cwv values are below threshold, then don't send an alert
  if (overThreshold.length === 0) {
    log.info(`All CWV values are below threshold for ${url}`);
    return noContent();
  }

  // create a backlink to rum dashboard to be included in alert message
  const backlink = await getBacklink(context, auditContext.finalUrl);

  const { channel, ts } = auditContext.slackContext;

  try {
    // send alert to the slack channel - group under a thread if ts value exists
    await postSlackMessage(token, {
      blocks: buildSlackMessage(url, overThreshold, backlink),
      channel,
      ts,
    });
  } catch (e) {
    log.error(`Failed to send Slack message for ${url}. Reason: ${e.message}`);
    throw e;
  }

  log.info(`Slack notification sent for ${url}`);

  return noContent();
}
