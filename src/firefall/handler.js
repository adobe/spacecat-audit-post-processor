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

const PROMPT_FILENAME = './static/prompts/firefall.prompt';

async function getPrompt(log, placeholders) {
  try {
    let prompt = fs.readFileSync(PROMPT_FILENAME, { encoding: 'utf8', flag: 'r' });
    log.debug('Prompt file content:', prompt);
    Object.keys(placeholders).forEach((key) => {
      prompt = prompt.replace(`[${key}]`, placeholders[key]);
    });
    return prompt;
  } catch (error) {
    log.error('Error reading prompt file:', error);
    return null;
  }
}

export async function recommendations(message, context) {
  const { type, auditResult: { siteId } } = message;
  const { dataAccess, log } = context;
  const {
    FIREFALL_API_ENDPOINT: firefallAPIEndpoint,
    FIREFALL_IMS_ORG: firefallIMSOrg,
    FIREFALL_API_KEY: firefallAPIKey,
    FIREFALL_API_AUTH: firefallAPIAuth,
  } = context.env;

  log.info(`Fetching Audit Results for ${siteId}`);
  if (!dataAccess || !isObject(dataAccess)) {
    return new Response({ error: 'Data Access is not available' }, { status: 500 });
  }

  const audits = await dataAccess.getAuditsForSite(siteId, type);

  log.debug(`Fetched Audits for ${siteId}`, audits);

  if (!audits) {
    return new Response({ error: `No audits found for site ${siteId}` }, { status: 404 });
  }
  const latestAuditResult = await audits[0].getAuditResult();

  if (!latestAuditResult) {
    return new Response({ error: `No audit result found for site ${siteId}` }, { status: 404 });
  }

  // get previous scores

  log.debug(`Fetched Audit Results for ${siteId}`, latestAuditResult);

  const { githubDiff } = latestAuditResult;
  const { markdownContext: { markdownDiff } } = latestAuditResult;
  const scoresAfter = latestAuditResult.scores;
  const scoresBefore = audits[1] ? await audits[1].getScores() : null;

  const placeholders = [
    githubDiff || 'no changes',
    markdownDiff || 'no changes',
    scoresAfter.toString(),
    scoresBefore.toString(),
  ];

  const prompt = getPrompt(log, placeholders);
  if (!isString(prompt)) {
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
    log.info('Recommendations:', responseData);
    return new Response(responseData);
  } catch (error) {
    throw new Error('Error getting recommendations from Firefall API');
  }
}
