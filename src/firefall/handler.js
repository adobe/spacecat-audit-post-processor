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

import { internalServerError } from '@adobe/spacecat-shared-http-utils';
import FirefallClient from '../support/firefall-client.js';

export async function getRecommendations(env, prompt, log = console) {
  const {
    FIREFALL_API_ENDPOINT: firefallAPIEndpoint,
    FIREFALL_IMS_ORG: firefallIMSOrg,
    FIREFALL_API_KEY: firefallAPIKey,
    FIREFALL_API_AUTH: firefallAPIAuth,
  } = env;

  const firefallClient = FirefallClient(
    firefallAPIEndpoint,
    firefallAPIKey,
    firefallAPIAuth,
    firefallIMSOrg,
  );

  const data = await firefallClient.fetchFirefallData(prompt);

  if (!data) {
    log.error('Unable to fetch Firefall data');
    return internalServerError('Unable to fetch Firefall data');
  }
  return data;
}
