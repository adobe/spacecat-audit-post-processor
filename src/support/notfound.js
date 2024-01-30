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
import RUMAPIClient from '@adobe/spacecat-shared-rum-api-client';

function isWithinLast7Days(date) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const checkedDate = new Date(date);
  return checkedDate >= sevenDaysAgo;
}
export const process404LatestAudit = (latestAudits) => {
  const results = [];
  let finalUrl;
  if (latestAudits.length > 0) {
    finalUrl = latestAudits[0].getAuditResult().finalUrl;
    for (const latestAudit of latestAudits) {
      if (isWithinLast7Days(latestAudit.getAuditedAt())) {
        const auditResult = latestAudit.getAuditResult();
        const { result } = auditResult;
        for (const resultItem of result) {
          results.push(resultItem);
        }
      }
    }
  }
  return { results, finalUrl };
};
export const get404Backlink = async (context, url) => {
  try {
    const rumApiClient = RUMAPIClient.createFrom(context);
    return await rumApiClient.create404Backlink(url, 7);
  } catch (e) {
    context.log.warn(`Failed to get a backlink for ${url}`);
    return null;
  }
};
