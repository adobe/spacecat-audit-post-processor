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
import { isArray } from '@adobe/spacecat-shared-utils';
import commaNumber from 'comma-number';
import { markdown, section } from './slack.js';
import { isWithinDays } from './utils.js';

export const INITIAL_404_SLACK_MESSAGE = '*404 REPORT* for the *last week* :thread:';

export const get404Backlink = async (context, fullAuditRef) => {
  const url = new URL(fullAuditRef);
  const urlParams = url.searchParams;
  const entries = urlParams.entries();
  const params = Object.fromEntries(entries);
  const domainUrl = urlParams.get('url');
  try {
    const rumApiClient = RUMAPIClient.createFrom(context);
    return await rumApiClient.create404Backlink(domainUrl, 7, params);
  } catch (e) {
    context.log.warn(`Failed to get a backlink for ${domainUrl}`);
    return null;
  }
};

export function build404SlackMessage(url, auditResult, backlink, mentions) {
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
export const send404Report = async ({
  slackClient,
  slackContext,
  message: {
    context,
    baseUrl,
    fullAuditRef,
    results,
  },
}) => {
  const backlink = await get404Backlink(context, fullAuditRef);
  const blocks = build404SlackMessage(
    baseUrl,
    results,
    backlink,
    slackContext?.mentions,
  );
  // send alert to the Slack channel - group under a thread if ts value exists
  return slackClient.postMessage({ ...slackContext, blocks, unfurl_links: false });
};

export const processLatest404Audit = (context, site, latestAudits) => {
  if (!isArray(latestAudits) || latestAudits.length === 0) {
    return {};
  }
  const latestAudit = latestAudits[0];
  if (isWithinDays(latestAudit.getAuditedAt(), 7)) {
    const auditResult = latestAudit.getAuditResult();
    const { result } = auditResult;
    if (isArray(result) && result.length > 0) {
      const fullAuditRef = latestAudit.getFullAuditRef();
      return {
        results: result, fullAuditRef, context, baseUrl: site.getBaseURL(),
      };
    }
  }
  return {};
};
