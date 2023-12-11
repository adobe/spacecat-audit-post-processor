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

import { isObject, isString } from '@adobe/spacecat-shared-utils';
import { Response } from '@adobe/fetch';
import * as fs from 'fs';
import { postSlackMessage } from '../support/slack.js';

const PROMPT_FILENAME = './static/prompts/firefall.prompt';

async function getPrompt(log, placeholders) {
  try {
    let prompt = fs.readFileSync(PROMPT_FILENAME, { encoding: 'utf8', flag: 'r' });
    log.debug('Prompt file content:', prompt);
    prompt = prompt.replace(/{{(.*?)}}/g, (match, key) => (key in placeholders ? placeholders[key] : match));
    return prompt;
  } catch (error) {
    log.error('Error reading prompt file:', error);
    return null;
  }
}

function getEmojiForChange(before, after) {
  if (after < before) return ':warning:'; // Emoji for increase
  if (after > before) return ':large_green_circle:'; // Emoji for decrease
  return ':heavy_minus_sign:'; // Emoji for no change
}

export async function recommendations(message, context) {
  const {
    type, url, auditResult: { siteId }, auditContext: { slackContext: { channelId, threadTs } },
  } = message;
  const { dataAccess, log } = context;
  const {
    FIREFALL_API_ENDPOINT: firefallAPIEndpoint,
    FIREFALL_IMS_ORG: firefallIMSOrg,
    FIREFALL_API_KEY: firefallAPIKey,
    FIREFALL_API_AUTH: firefallAPIAuth,
    SLACK_BOT_TOKEN: slackToken,
  } = context.env;

  log.info(`Fetching Audit Results for ${siteId}`);
  if (!dataAccess || !isObject(dataAccess)) {
    log.error('Data Access is not available');
    return new Response({ error: 'Data Access is not available' }, { status: 500 });
  }

  const audits = await dataAccess.getAuditsForSite(siteId, type);

  log.debug(`Fetched Audits for ${siteId}`, audits);

  if (!audits) {
    log.error(`No audits found for site ${siteId}`);
    return new Response({ error: `No audits found for site ${siteId}` }, { status: 404 });
  }

  // sort audits by auditedAt so that the latest audit is at the first position
  audits.sort((a, b) => new Date(b.state.auditedAt) - new Date(a.state.auditedAt));

  const latestAuditResult = await audits[0].getAuditResult();

  if (!latestAuditResult) {
    log.error(`No audit result found for site ${siteId}`);
    return new Response({ error: `No audit result found for site ${siteId}` }, { status: 404 });
  }

  // get previous scores

  log.debug(`Fetched Audit Results for ${siteId}`, latestAuditResult);

  const { gitHubDiff } = latestAuditResult;
  const { markdownContext: { markdownDiff } } = latestAuditResult;
  const scoresAfter = latestAuditResult.scores;
  const scoresBefore = audits[1] ? await audits[1].getScores() : null;

  const placeholders = {
    codeDiff: gitHubDiff || 'no changes',
    mdDiff: markdownDiff || 'no changes',
    scoreBefore: scoresBefore ? scoresBefore.toString() : 'no previous scores',
    scoreAfter: scoresAfter ? scoresAfter.toString() : 'no scores',
  };

  const prompt = await getPrompt(log, placeholders);
  if (!isString(prompt)) {
    log.error('Prompt is not available');
    return new Response({ error: 'Prompt is not available' }, { status: 500 });
  }

  const body = JSON.stringify({
    dialogue: {
      question: prompt,
    },
    llm_metadata: {
      llm_type: 'azure_chat_openai',
      model_name: 'gpt-4',
      temperature: 0.5,
    },
  });

  log.debug('Request body for Firefall API :', body);

  try {
    const response = await fetch(firefallAPIEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firefallAPIAuth}`,
        'x-api-key': firefallAPIKey,
        'x-gw-ims-org-id': firefallIMSOrg,
      },
      body,
    });

    const responseData = await response.json();
    const recommendationData = responseData.generations[0][0].text;
    log.info('Recommendations:', recommendationData);

    let data = {};
    try {
      data = JSON.parse(recommendationData);
    } catch (error) {
      log.error('Error parsing JSON from Firefall response:', error);
    }

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Insights and Recommendations:* for ${url}`,
        },
      },
    ];

    const scoreFields = [];

    Object.keys(scoresBefore).forEach((key) => {
      const before = scoresBefore[key];
      const after = scoresAfter[key];
      const emoji = getEmojiForChange(Number(before), Number(after));
      scoreFields.push({
        type: 'mrkdwn',
        text: `${key.charAt(0).toUpperCase() + key.slice(1)}: ${before} -> ${after} ${emoji}`,
      });
    });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Score Changes:*',
      },
      fields: scoreFields,
    });

    data.insights.forEach((item, index) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${index + 1}. *Insight:* ${item.insight}\n*Recommendation:* ${item.recommendation}`,
        },
      });
    });

    data.code.forEach((codeItem) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${codeItem}\`\`\``,
        },
      });
    });

    await postSlackMessage(slackToken, {
      blocks,
      channel: channelId,
      ts: threadTs,
    });

    return new Response(recommendationData);
  } catch (error) {
    throw new Error(`Error getting recommendations from Firefall API: ${error}`);
  }
}
