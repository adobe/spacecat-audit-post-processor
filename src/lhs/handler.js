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
import { badRequest, noContent } from '@adobe/spacecat-shared-http-utils';

export default async function lhsDesktopHandler(message, context) {
  const { log } = context;
  const { url, auditContext } = message;
  const { fullAuditRef } = auditContext;

  // check that audit is legit
  if (!fullAuditRef) {
    const msg = `The audit reference link is missing in the message body for ${url}`;
    log.info(msg);
    return badRequest(msg);
  }

  // Fire and Forget to Cloudflare Worker
  const workerUrl = `https://datadesk-audit-processor.adobeaem.workers.dev/?auditRef=${fullAuditRef}`;
  await fetch(workerUrl);

  log.info(`Audit Data Sent to Bigquery via ${workerUrl}`);
  return noContent();
}
