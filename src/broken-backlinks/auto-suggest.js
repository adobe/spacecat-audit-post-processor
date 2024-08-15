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

import { noContent } from '@adobe/spacecat-shared-http-utils';

export default async function brokenBacklinksAutoSuggestHandler(message, context) {
  const { siteId, type, suggestionsResult } = message;
  const { log, dataAccess } = context;

  log.info(`Report of type ${type} received for site ID: ${siteId}`);

  if (!suggestionsResult?.brokenBacklinks?.length > 0) {
    log.error('No broken backlinks found in suggestions result');
    return noContent();
  }
  log.info(`message: ${JSON.stringify(message)}`);

  const audit = await dataAccess.getLatestAuditForSite(siteId, 'broken-backlinks');
  const auditResult = audit.getAuditResult();
  log.info(`auditResult: ${JSON.stringify(auditResult)}`);
  if (!auditResult?.brokenBacklinks?.length > 0) {
    log.error(`No audit with broken backlinks found for site ID: ${siteId}`);
    return noContent();
  }

  const updatedAudit = {
    siteId,
    auditType: 'broken-backlinks',
    auditedAt: audit.getAuditedAt(),
    expiresAt: audit.getExpiresAt(),
    fullAuditRef: audit.getFullAuditRef(),
    isLive: audit.isLive(),
    auditResult: {
      ...auditResult,
      brokenBacklinks: auditResult.brokenBacklinks.map((backlink) => ({
        ...backlink,
        urls_suggested: suggestionsResult.brokenBacklinks.find(
          (suggestion) => suggestion.broken_url === backlink.url_to,
        )?.suggested_urls || [],
      })),
    },
    previousAuditResult: audit.getPreviousAuditResult(),
  };

  const latestAudit = await dataAccess.updateLatestAudit(updatedAudit);

  log.info(`Updated audit: ${JSON.stringify(latestAudit.getAuditResult())}`);

  return noContent();
}
