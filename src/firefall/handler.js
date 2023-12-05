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

export async function recommendations(message, context) {
  const { type, auditResult: { siteId } } = message;
  const { dataAccess, log } = context;
  const {
    OPENAI_API_ENDPOINT: openAIAPIEndpoint,
    OPENAI_API_KEY: openAIAPIKey,
  } = context.env;

  log.info(`Fetching Audit Results for ${siteId}`);

  const latestAudit = await dataAccess.getLatestAuditForSite(siteId, type);
  const auditResult = await latestAudit.getAuditResult();
  // get previous scores

  log.debug(`Fetched Audit Results for ${siteId}`, auditResult);

  const data = {
    prompt: 'Your prompt goes here',
  };

  fetch(openAIAPIEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAIAPIKey}`,
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((responseData) => {
      log.info('Recommendations:', responseData);
    })
    .catch((error) => {
      log.error('Error getting recommendations:', error);
    });
}
