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

import humanFormat from 'human-format';
import commaNumber from 'comma-number';
import { postSlackMessage, markdown, section } from '../support/slack.js';
import { generateDomainKey } from '../support/rumapi.js';

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

const timeScale = new humanFormat.Scale({
  ms: 1,
  s: 1000,
});

function verifyParameters(message, context) {
  const { env: { SLACK_BOT_TOKEN: token } } = context;
  const {
    url, auditContext, auditResult,
  } = message;

  if (!token) {
    throw Error('Slack bot token is not set');
  }

  if (!url || typeof auditContext !== 'object' || !auditResult) {
    throw Error('Required parameters missing in the message body');
  }

  if (!Array.isArray(auditResult)) {
    throw Error('Audit result is not an array');
  }

  const { finalUrl, slackContext } = auditContext;

  if (!finalUrl || typeof slackContext !== 'object' || !slackContext.channel) {
    throw Error('Required parameters missing in audit context');
  }
}
export function getColorEmoji(type, value) {
  const scores = SCORES[type];
  if (!scores) return COLOR_EMOJIS.gray;
  const pair = Object.entries(scores).reverse()
    .find((e) => Number.isFinite(value) && value >= e[0]);
  return pair ? pair[1] : COLOR_EMOJIS.gray;
}

async function createBacklink(rumApiKey, finalUrl, log) {
  try {
    const domainkey = await generateDomainKey(rumApiKey, finalUrl);
    return `https://main--franklin-dashboard--adobe.hlx.live/views/rum-dashboard?interval=7&offset=0&limit=100&url=${finalUrl}&domainkey=${domainkey}`;
  } catch (e) {
    log.info('Could not generate domain key. Will not add backlink to result');
    return null;
  }
}

async function buildSlackMessage(url, finalUrl, overThreshold, rumApiKey, log) {
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

  const backlink = await createBacklink(rumApiKey, finalUrl, log);

  if (backlink) {
    blocks.push(section({
      text: markdown(`*To access the full report <${backlink}|click here> :link:* _(expires in 7 days)_`),
    }));
  }

  return blocks;
}

export default async function cwvHandler(message, context) {
  const { url, auditResult, auditContext } = message;
  const { log, env: { RUM_API_UBER_KEY: rumApiKey, SLACK_BOT_TOKEN: token } } = context;

  verifyParameters(message, context);

  const { finalUrl, slackContext: { channel, ts } } = auditContext;

  const overThreshold = auditResult
    .filter((result) => result.avglcp > 2500 || result.avgcls > 0.1 || result.avginp > 200);

  if (overThreshold.length === 0) {
    log.info(`All CWV values are below threshold for ${url}`);
    return new Response(200);
  }

  const blocks = await buildSlackMessage(url, finalUrl, overThreshold, rumApiKey, log);

  await postSlackMessage(token, { blocks, channel, ts });

  log.info(`Slack notification sent for ${url}`);

  return new Response(200);
}
