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

import { createUrl } from '@adobe/fetch';
import { fetch } from './utils.js';

export const SLACK_API = 'https://slack.com/api/chat.postMessage';

export function getQueryParams(blocks, channel, ts) {
  return {
    unfurl_links: false,
    channel,
    blocks: JSON.stringify(blocks),
    ...(ts && { thread_ts: ts }),
  };
}

export async function postSlackMessage(token, opts) {
  if (!token) {
    throw new Error('Missing slack bot token');
  }

  const { blocks, channel, ts } = opts;

  const params = getQueryParams(blocks, channel, ts);

  let resp;
  let respJson;
  try {
    resp = await fetch(createUrl(SLACK_API, params), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    respJson = await resp.json();
  } catch (e) {
    throw new Error(`Failed to send slack message. ${resp ? `Status: ${resp.status}` : /* c8 ignore next  */ ''}`);
  }

  if (!respJson.ok) {
    throw new Error(`Slack message was not acknowledged. Error: ${respJson.error}`);
  }

  return {
    channel: respJson.channel,
    ts: respJson.ts,
  };
}

export function section(content) {
  return { type: 'section', ...content };
}

export function markdown(text) {
  return { type: 'mrkdwn', text };
}
