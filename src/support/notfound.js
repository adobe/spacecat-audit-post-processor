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
import RUMAPIClient from '@adobe/spacecat-shared-rum-api-client';
import { build404InitialSlackMessage, build404SlackMessage } from './slack.js';

export const sendInitial404Message = async (slackClient, slackContext) => {
  const blocks = build404InitialSlackMessage(slackContext?.mentions);
  const { threadId } = await slackClient.postMessage(
    {
      channel: slackContext?.channel,
      blocks,
    },
  );
  return { thread_ts: threadId, channel: slackContext.channel };
};
export const get404Backlink = async (context, url) => {
  try {
    const rumApiClient = RUMAPIClient.createFrom(context);
    return await rumApiClient.create404Backlink(url, 7);
  } catch (e) {
    context.log.warn(`Failed to get a backlink for ${url}`);
    return null;
  }
};

export const send404Report = async ({
  context,
  slackClient,
  slackContext,
  baseUrl,
  finalUrl,
  results,
}) => {
  const backlink = await get404Backlink(context, finalUrl);
  const blocks = build404SlackMessage(
    baseUrl,
    results,
    backlink,
    slackContext?.mentions,
  );
  // send alert to the slack channel - group under a thread if ts value exists
  // eslint-disable-next-line no-await-in-loop
  return slackClient.postMessage({ ...slackContext, blocks, unfurl_links: false });
};
