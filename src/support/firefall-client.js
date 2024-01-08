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

import { isValidUrl, isString } from '@adobe/spacecat-shared-utils';

/**
 * Represents a utility to fetch content from the Firefall API.
 *
 * @param firefallAPIEndpoint - The API Endpoint for Firefall.
 * @param firefallAPIKey - The Firefall API Key.
 * @param firefallAPIAuth - The Firefall API Bearer authorization token.
 * @param firefallIMSOrg - The Firefall IMS Org
 * @param {Object} log - The Logger.
 *
 * @returns {FirefallClient} - the Firefall client.
 */
function FirefallClient(
  firefallAPIEndpoint,
  firefallAPIKey,
  firefallAPIAuth,
  firefallIMSOrg,
  log = console,
) {
  function validateFirefallResponse(response) {
    if (!response || typeof response !== 'object' || !Array.isArray(response.insights)) {
      return false;
    }

    return response.insights.every((item) => item
          && typeof item === 'object'
          && typeof item.insight === 'string'
          && typeof item.recommendation === 'string'
          && typeof item.code === 'string');
  }
  async function fetchFirefallData(prompt) {
    if (!isValidUrl(firefallAPIEndpoint)) {
      log.error(`Firefall API Endpoint is not valid: ${firefallAPIEndpoint}`);
      return null;
    }

    if (!isString(prompt)) {
      log.error('Invalid prompt provieded for Firefall.');
      return null;
    }

    const body = JSON.stringify({
      dialogue: {
        question: prompt,
      },
      llm_metadata: {
        max_tokens: 4000,
        llm_type: 'azure_chat_openai',
        model_name: 'gpt-4',
        temperature: 0.5,
      },
    });

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

      if (!response.ok) {
        log.error(`Could not obtain data from Firefall: ${response.statusText}`);
        return null;
      }

      const responseData = await response.json();
      if (!responseData.generations?.[0]?.[0]) {
        log.error('Could not obtain data from Firefall: Generations object is missing.');
        return null;
      }
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseData.generations[0][0].text);
      } catch (e) {
        log.error('Returned Data from Firefall is not a JSON object.');
        return null;
      }
      if (!validateFirefallResponse(parsedResponse)) {
        log.error('Could not obtain data from Firefall: Invalid response format.');
        return null;
      }
      return parsedResponse;
    } catch (error) {
      log.error(`Error while fetching data from Firefall API, using endpoint: ${firefallAPIEndpoint}:`, error.message);
      return null;
    }
  }

  return {
    fetchFirefallData,
  };
}

export default FirefallClient;
