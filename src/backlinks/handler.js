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
import { hasText, isObject } from '@adobe/spacecat-shared-utils';
import { processBrokenBacklinksAuditResult } from '../support/backlinks.js';

function isValidMessage(message) {
  return hasText(message.url)
    && isObject(message.auditContext?.slackContext)
    && isObject(message.auditResult)
    && Object.values(message.auditResult).every((result) => isObject(result));
}

export default async function brokenBacklinksHandler(message, context) {
  const { log } = context;
  const { auditResult, auditContext } = message;
  const { env: { SLACK_BOT_TOKEN: token } } = context;

  if (!isValidMessage(message)) {
    return badRequest('Required parameters missing in the message.');
  }

  await processBrokenBacklinksAuditResult(auditResult, auditContext.slackContext, token, log);

  return noContent();
}
