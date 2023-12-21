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

import { isObject } from '@adobe/spacecat-shared-utils';
import { internalServerError, notFound } from '@adobe/spacecat-shared-http-utils';
import { markdown, section } from '../support/slack.js';

export async function getLHSData(services, site, audit, log = console) {
  const { dataAccess, gitHubClient, contentClient } = services;
  const { url, siteId, gitHubUrl } = site;
  const { type, finalUrl } = audit;

  if (!dataAccess || !isObject(dataAccess)) {
    log.error('Data Access is not available');
    return internalServerError('Data Access is not available');
  }

  const audits = await dataAccess.getAuditsForSite(siteId, type);
  if (!audits || audits.length === 0) {
    log.error(`No audits found for site ${siteId}`);
    return notFound(`No audits found for site ${siteId}`);
  }

  const [latestAudit, previousAudit] = audits;

  const [latestAuditedAt, previousAuditedAt, scoresAfter, scoresBefore] = await Promise.all([
    latestAudit.getAuditedAt().catch(() => null),
    previousAudit.getAuditedAt().catch(() => null),
    latestAudit.getScores().catch(() => null),
    previousAudit.getScores().catch(() => null),
  ]);

  const [gitHubDiff, markdownContext] = await Promise.all([
    gitHubClient.fetchGithubDiff(
      url,
      latestAuditedAt,
      previousAuditedAt,
      gitHubUrl,
    ).catch(() => null),
    contentClient.fetchMarkdown(url, finalUrl).catch(() => null),
  ]);

  return {
    codeDiff: gitHubDiff || 'no changes',
    mdContent: markdownContext?.markdownContent || 'no content',
    scoreBefore: scoresBefore || 'no previous scores',
    scoreAfter: scoresAfter || 'no scores',
  };
}

function getEmojiForChange(before, after) {
  if (after < before) return ':warning:'; // Emoji for increase
  if (after > before) return ':large_green_circle:'; // Emoji for decrease
  return ':heavy_minus_sign:'; // Emoji for no change
}

export function buildSlackMessage(url, data, lhsData) {
  const blocks = [
    section({
      text: markdown(`*Insights and Recommendations:* for ${url}`),
    }),
  ];

  if (lhsData.scoreBefore && lhsData.scoreAfter) {
    const scoreFields = Object.entries(lhsData.scoreBefore).map(([key, before]) => {
      const after = lhsData.scoreAfter[key];
      const emoji = getEmojiForChange(Number(before), Number(after));
      return markdown(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${before} -> ${after} ${emoji}`);
    });

    if (scoreFields.length > 0) {
      blocks.push(section({
        text: markdown('*Score Changes:*'),
        fields: scoreFields,
      }));
    }
  }

  if (data.insights) {
    blocks.push(...data.insights.map((item, index) => section({
      text: markdown(`${index + 1}. *Insight:* ${item.insight}\n*Recommendation:* ${item.recommendation}`),
    })));
  }

  if (data.code) {
    blocks.push(...data.code.map((codeItem) => section({
      text: markdown(`\`\`\`${codeItem}\`\`\``),
    })));
  }

  return blocks;
}
