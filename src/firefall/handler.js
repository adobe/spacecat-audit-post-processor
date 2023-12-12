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
import { postSlackMessage } from '../support/slack.js';
import { getPrompt } from '../support/utils.js';

// utils
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

  // fetch all of the above from utils??

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

  const prompt = await getPrompt(placeholders);
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

    log.debug('Response from Firefall API:', responseData);

    const recommendationData = responseData.generations[0][0].text;

    log.debug(`generations: ${responseData.generations[0][0]}`);
    log.info('Recommendations:', recommendationData);

    const data = JSON.parse(recommendationData);
    log.debug(`parsed recommendations: ${data}`);
    const { insights } = data;
    log.debug(`insights: ${insights}`);

    // slack util
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

    log.debug('Creating Slack message');
    log.debug(`Adding score changes to Slack message. Scores before: ${scoresBefore}, Scores after: ${scoresAfter}`);

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

    log.debug(`Adding insights and recommendations to Slack message. Insights: ${data.insights}`);

    data.insights.forEach((item, index) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${index + 1}. *Insight:* ${item.insight}\n*Recommendation:* ${item.recommendation}`,
        },
      });
    });

    log.debug(`Adding code snippets to Slack message. Code snippets: ${data.code}`);

    if (typeof data.code === 'object') {
      log.debug('Code is an array');
      data.code.forEach((codeItem) => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`${codeItem}\`\`\``,
          },
        });
      });
    } else if (typeof data.code === 'string') {
      log.debug('Code is a string');
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${data.code}\`\`\``,
        },
      });
    } else {
      log.debug('Code is not an array or a string');
    }

    log.debug(`Posting Slack message to channel: ${channelId}, thread: ${threadTs} with blocks: ${blocks}`);

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
