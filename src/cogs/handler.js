/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { badRequest, internalServerError, noContent } from '@adobe/spacecat-shared-http-utils';
import { fetch } from '../support/utils.js';

export default async function cogsHandler(message, context) {
  const { log } = context;
  const { monthYear, usageCost } = message;
  const { COGS_EXCEL_POST_URL: cogsExcelUrl } = context.env;
  if (!monthYear || monthYear === '') {
    return badRequest('MonthYear is missing');
  }
  if (!usageCost || Object.keys(usageCost).length === 0) {
    return badRequest('UsageCost is missing');
  }
  try {
    const response = await fetch(cogsExcelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { MONTH: monthYear, ...usageCost } }),
    });
    if (response.status !== 201) {
      return badRequest(`Failed to post data to ${cogsExcelUrl}. Status: ${response.status}`);
    }
    log.info(`Successfully posted data to ${cogsExcelUrl}`);
    return noContent();
  } catch (e) {
    log.error(e);
    return internalServerError('Failed to post data to COGS Excel');
  }
}
