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

export const INITIAL_404_SLACK_MESSAGE = '*404 REPORT* for the *last week* :thread:';

export const get404Backlink = async (context, url) => {
  try {
    const rumApiClient = RUMAPIClient.createFrom(context);
    return await rumApiClient.create404Backlink(url, 7);
  } catch (e) {
    context.log.warn(`Failed to get a backlink for ${url}`);
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
    finalUrl,
    results,
  },
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
function isWithinLast7Days(date) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const checkedDate = new Date(date);
  return checkedDate >= sevenDaysAgo;
}

export const processLatest404Audit = (context, site, latestAudits) => {
  const results = [];
  let finalUrl;
  if (latestAudits.length > 0) {
    finalUrl = latestAudits[0].getAuditResult().finalUrl;
    for (const latestAudit of latestAudits) {
      if (isWithinLast7Days(latestAudit.getAuditedAt())) {
        const auditResult = latestAudit.getAuditResult();
        const { result } = auditResult;
        for (const resultItem of result) {
          results.push(resultItem);
        }
      }
    }
  }
  if (results.length > 0) {
    return {
      results, finalUrl, context, baseUrl: site.getBaseURL(),
    };
  }
  return {};
};
