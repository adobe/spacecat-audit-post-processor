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

import { postSlackMessage } from '../support/slack.js';

function verifyParameters(message, context) {
  const { log, env: { SLACK_BOT_TOKEN: token } } = context;
  const { url, auditContext, auditResult } = message;

  if (!url || !auditContext || Array.isArray(auditResult)) {
    log.error('some stuff hasnt been satisfied');
    throw Error('some stuff hasnt been satisfied');
  }

  if (!token) {
    log.error('slack bot token missing');
    throw Error('slack bot token missing');
  }
}

function buildSlackMessage(overThreshold) {

}

export function cwvHandler(message, context) {
  const { url, auditResult, auditContext } = message;
  const { log, env: { SLACK_BOT_TOKEN: token } } = context;

  verifyParameters(message, context);

  const overThreshold = auditResult.filter((result) => result.avglcp > 2500);





  const { channel, ts } = auditContext.slackContext;

  return null;
}
