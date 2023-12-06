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

export async function recommendations(message, context) {
  const { type, auditResult: { siteId } } = message;
  const { dataAccess, log } = context;
  const {
    OPENAI_API_ENDPOINT: openAIAPIEndpoint,
    OPENAI_API_KEY: openAIAPIKey,
  } = context.env;

  log.info(`Fetching Audit Results for ${siteId}`);

  if (!isObject(dataAccess)) {
    throw new Error('Data Access is not available');
  }

  const latestAudit = await dataAccess.getLatestAuditForSite(siteId, type);

  if (!latestAudit) {
    throw new Error(`No audit found for site ${siteId}`);
  }
  const auditResult = await latestAudit.getAuditResult();

  if (!auditResult) {
    throw new Error(`No audit result found for site ${siteId}`);
  }

  // get previous scores

  log.debug(`Fetched Audit Results for ${siteId}`, auditResult);

  const data = {
    prompt: 'Your prompt goes here',
  };

  try {
    const response = await fetch(openAIAPIEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIAPIKey}`,
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    log.info('Recommendations:', responseData);
    return responseData;
  } catch (error) {
    throw new Error('Error getting recommendations from Firefall API');
  }
}
