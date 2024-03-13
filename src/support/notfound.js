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
import {
  containsLangCode, convertToCSV, getFilename, isWithinDays,
} from './utils.js';

export const INITIAL_404_SLACK_MESSAGE = '*404 REPORT* for the *last week* :thread:';
export const SEARCH_ENGINE_BASE_URL = 'https://www.googleapis.com/customsearch/v1';

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

export function getSuggestionQuery(href) {
  const { hostname, pathname } = new URL(href);

  const segments = pathname.split('/');
  segments.shift();
  const parts = Math.min(segments.length, 2);

  // eslint-disable-next-line for-direction
  for (let i = parts - 1; i >= 0; i -= 1) {
    const segment = segments[i];
    if (containsLangCode(segment)) {
      for (let j = 0; j <= i; j += 1) {
        segments.shift();
      }
      break;
    }
  }

  return `${segments.join(' ')} site:${hostname}`;
}

export async function findSuggestion(url, searchEngineId, searchEngineKey) {
  const query = getSuggestionQuery(url);
  const resp = await fetch(`${SEARCH_ENGINE_BASE_URL}?cx=${searchEngineId}&key=${searchEngineKey}&q=${encodeURIComponent(query)}`);
  if (!resp.ok) {
    throw new Error(`Google API returned unsuccessful response ${resp.status}`);
  }
  const json = await resp.json();

  const suggestion = json.items[0].link;
  if (url === suggestion) {
    throw new Error('Google API suggested the same URL');
  }
  return new URL(suggestion).pathname;
}

export async function build404Suggestions(results, context) {
  const {
    GOOGLE_SEARCH_API_ID: searchEngineId,
    GOOGLE_SEARCH_API_KEY: searchEngineKey,
  } = context.env;
  const { log } = context;

  const suggestions = [];
  const uniqueAuditResults = [...new Set(results.map((result) => result.url))];

  for (const url of uniqueAuditResults) {
    let suggestion = '/';
    try {
      // eslint-disable-next-line no-await-in-loop
      suggestion = await findSuggestion(url, searchEngineId, searchEngineKey);
    } catch (e) {
      log.warn(`Error while finding a suggestion for ${url}, failling back to '/'. Reason: ${e.message}`);
    }

    suggestions.push({
      Source: new URL(url).pathname,
      Destination: suggestion,
    });
  }

  return suggestions;
}

export async function uploadSuggestions(url, slackClient, slackContext, suggestions) {
  const csvData = convertToCSV(suggestions);
  const file = Buffer.from(csvData, 'utf-8');
  const urlWithProtocolStripped = url?.replace(/^(https?:\/\/)/, '');
  const filename = getFilename(urlWithProtocolStripped, 'redirect-suggestions', 'csv');
  const text = 'The following CSV file contains a list of suggestions to incorporate into your redirecting rules. Please review and <https://www.aem.live/docs/redirects|append them to your existing redirects.xlsx file>.';

  // send alert to the Slack channel - group under a thread if ts value exists
  await slackClient.fileUpload({
    thread_ts: slackContext?.thread_ts,
    channel_id: slackContext?.channel,
    file,
    filename,
    initial_comment: text,
    unfurl_links: false,
  });
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
  await slackClient.postMessage({ ...slackContext, blocks, unfurl_links: false });

  const suggestions = await build404Suggestions(results, context);
  await uploadSuggestions(baseUrl, slackClient, slackContext, suggestions);
};

export const processLatest404Audit = (context, site, latestAudits) => {
  if (latestAudits.length === 0) {
    return {};
  }
  const latestAudit = latestAudits[0];
  if (isWithinDays(latestAudit.getAuditedAt(), 7)) {
    const auditResult = latestAudit.getAuditResult();
    const fullAuditRef = latestAudit.getFullAuditRef();
    const { result } = auditResult;
    if (result.length > 0) {
      return {
        results: result, fullAuditRef, context, baseUrl: site.getBaseURL(),
      };
    }
  }
  return {};
};
