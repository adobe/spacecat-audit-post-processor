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
import { internalServerError, noContent } from '@adobe/spacecat-shared-http-utils';
import { isObject } from '@adobe/spacecat-shared-utils';
import { build404SlackMessage, post404InitialSlackMessage, postSlackMessage } from '../support/slack.js';
import { get404Backlink } from '../support/utils.js';

const ALERT_TYPE = '404';

export default async function notFoundInternalDigestHandler(message, context) {
  const {
    env: {
      SLACK_BOT_TOKEN: token, AUDIT_REPORT_SLACK_CHANNEL_ID: slackChannelId,
    }, dataAccess, log,
  } = context;
  const rumApiClient = RUMAPIClient.createFrom(context);
  const urls = await rumApiClient.getDomainList();
  let slackContext = {};
  try {
    slackContext = await post404InitialSlackMessage(token, slackChannelId);
  } catch (e) {
    log.error(`Failed to send initial Slack message. Reason: ${e.message}`);
    return internalServerError('Failed to send initial Slack message');
  }
  for (const domainUrl of urls) {
    // eslint-disable-next-line no-await-in-loop
    const site = await dataAccess.getSiteByBaseURL(`https://${domainUrl}`);
    if (isObject(site)) {
      // eslint-disable-next-line no-await-in-loop
      const latest404AuditReport = await dataAccess.getLatestAuditForSite(site.getId(), ALERT_TYPE);
      if (isObject(latest404AuditReport)) {
        const { finalUrl, result } = latest404AuditReport.state.auditResult;
        // eslint-disable-next-line no-await-in-loop
        const backlink = await get404Backlink(context, finalUrl);
        if (result && result.length > 0) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await postSlackMessage(token, {
              blocks: build404SlackMessage(
                site.getBaseURL(),
                result,
                backlink,
                slackContext.mentions,
              ),
              ...slackContext,
            });
          } catch (e) {
            log.error(`Failed to send Slack message for ${site.getBaseURL()}. Reason: ${e.message}`);
          }
        }
      }
    }
  }
  return noContent();
}
