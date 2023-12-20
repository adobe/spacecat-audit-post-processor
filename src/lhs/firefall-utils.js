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
import ContentClient from '../support/content-client.js';

export async function getLHSData(type, site, finalUrl, dataAccess, log = console) {
  const { url, siteId } = site;
  if (!dataAccess || !isObject(dataAccess)) {
    log.error('Data Access is not available');
    return internalServerError('Data Access is not available');
  }

  const audits = await dataAccess.getAuditsForSite(siteId, type);
  if (!audits || audits.length === 0) {
    log.error(`No audits found for site ${siteId}`);
    return notFound(`No audits found for site ${siteId}`);
  }

  // sort audits by auditedAt so that the latest audit is at the first position
  audits.sort((a, b) => new Date(b.state.auditedAt) - new Date(a.state.auditedAt));

  const latestAuditResult = await audits[0].getAuditResult();
  if (!latestAuditResult) {
    log.error(`No audit result found for site ${siteId}`);
    return notFound(`No audit result found for site ${siteId}`);
  }

  const { gitHubDiff } = latestAuditResult;
  const contentClient = ContentClient(log);
  const markdownContext = await contentClient.fetchMarkdown(
    url,
    finalUrl,
  );
  const { markdownContent } = markdownContext;
  const scoresAfter = latestAuditResult.scores;
  const scoresBefore = audits[1] ? await audits[1].getScores() : null;

  return {
    codeDiff: gitHubDiff || 'no changes',
    mdContent: markdownContent || 'no content',
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
  const blocks = [];
  blocks.push(section({
    text: markdown(`*Insights and Recommendations:* for ${url}`),
  }));

  const scoreFields = [];

  if (lhsData.scoresBefore && lhsData.scoresAfter) {
    const { scoresBefore } = data;
    Object.keys(scoresBefore).forEach((key) => {
      const before = scoresBefore[key];
      const after = lhsData.scoresAfter[key];
      const emoji = getEmojiForChange(Number(before), Number(after));
      scoreFields.push(markdown(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${before} -> ${after} ${emoji}`));
    });
  }

  if (scoreFields.length > 0) {
    blocks.push(section({
      text: markdown('*Score Changes:*'),
      fields: scoreFields,
    }));
  }

  data.insights?.forEach((item, index) => {
    blocks.push(section({
      text: markdown(`${index + 1}. *Insight:* ${item.insight}\n*Recommendation:* ${item.recommendation}`),
    }));
  });

  data.code?.forEach((codeItem) => {
    blocks.push(section({
      text: markdown(`\`\`\`${codeItem}\`\`\``),
    }));
  });

  return blocks;
}
