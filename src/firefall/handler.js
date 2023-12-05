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
    FIREFALL_API_ENDPOINT: firefallAPIEndpoint,
    FIREFALL_IMS_ORG: firefallIMSOrg,
    FIREFALL_API_KEY: firefallAPIKey,
    FIREFALL_API_AUTH: firefallAPIAuth,
  } = context.env;

  log.info(`Fetching Audit Results for ${siteId}`);

  const latestAudit = await dataAccess.getLatestAuditForSite(siteId, type);
  const auditResult = await latestAudit.getAuditResult();

  log.debug(`Fetched Audit Results for ${siteId}`, auditResult);

  const headers = {
    'x-gw-ims-org-id': `${firefallIMSOrg}`,
    'x-api-key': `${firefallAPIKey}`,
    Authorization: `Bearer ${firefallAPIAuth}`,
    'Content-Type': 'application/json',
  };

  const body = JSON.stringify({
    dialogue: {
      question: 'what is firefall in yosemite in 10 words?',
    },
    llm_metadata: {
      llm_type: 'azure_chat_openai',
      model_name: 'gpt-4',
      temperature: 0.5,
    },
  });

  // fetch(firefallAPIEndpoint, {
  //   method: 'POST',
  //   headers: headers,
  //   body: body
  // })
  //   .then(response => response.json())
  //   .then(data => console.log(data))
  //   .catch(error => console.error('Error:', error));
}
