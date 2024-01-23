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
import { isArray } from '@adobe/spacecat-shared-utils';
import commaNumber from 'comma-number';
import { fetch } from './utils.js';

export const SLACK_API = 'https://slack.com/api/chat.postMessage';
export const INITIAL_404_SLACK_MESSAGE = '*404 REPORT* for the *last week* :thread:';
export const SLACK_FILE_API = 'https://slack.com/api/files.upload';

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

export async function post404InitialSlackMessage(token, slackChannelId, mentions) {
  return postSlackMessage(token, {
    channel: slackChannelId,
    blocks: JSON.stringify([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${isArray(mentions) ? mentions.join(' ').toString() : ''} ${INITIAL_404_SLACK_MESSAGE}`,
        },
      },
    ]),
  });
}
export async function uploadSlackFile(token, opts) {
  if (!token) {
    throw new Error('Missing slack bot token');
  }

  const { file, fileName, channel } = opts;

  try {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('channels', channel);
    formData.append('file', file, fileName);

    const response = await fetch(SLACK_FILE_API, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Slack upload file API request failed. Status: ${response.status}`);
    }

    let responseJson;
    try {
      responseJson = await response.json();
    } catch (e) {
      throw new Error(`Failed to parse Slack API response. Error: ${e}`);
    }

    if (!responseJson.ok) {
      throw new Error(`Slack message was not acknowledged. Error: ${responseJson.error}`);
    }

    return {
      fileUrl: responseJson.file.url_private,
    };
  } catch (e) {
    throw new Error(`Failed to upload file to slack. Reason: ${e.message}`);
  }
}

export function section(content) {
  return { type: 'section', ...content };
}

export function markdown(text) {
  return { type: 'mrkdwn', text };
}

export function build404SlackMessage(url, finalUrl, auditResult, backlink, mentions) {
  const blocks = [];

  blocks.push(section({
    text: markdown(`${isArray(mentions) ? mentions.join(' ').toString() : ''} For *${url}*, ${auditResult.length} page(s) had 404s *last week* for the real users.\n More information is below (up to three pages):`),
  }));

  for (let i = 0; i < Math.min(3, auditResult.length); i += 1) {
    const topLine = section({
      text: markdown(`:arrow-red2: *<${auditResult[i].url}|${auditResult[i].url}>*`),
    });

    const stats = section({
      fields: [
        markdown(`:mag: *Pageviews:* ${commaNumber(auditResult[i].pageviews)}`),
        markdown(`:mag: *Source:* ${commaNumber(auditResult[i].source)}`),
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
