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

import { internalServerError, noContent } from '@adobe/spacecat-shared-http-utils';
import { SLACK_TARGETS, SlackClient } from '@adobe/spacecat-shared-slack-client';
import { process404LatestAudit, sendInitial404Message, send404Report } from '../support/notfound.js';

const ALERT_TYPE = '404';

export default async function notFoundInternalDigestHandler(message, context) {
  const {
    env: { AUDIT_REPORT_SLACK_CHANNEL_ID: slackChannelId }, dataAccess, log,
  } = context;
  let sentInitialMessage = false;
  const slackClient = SlackClient.createFrom(context, SLACK_TARGETS.ADOBE_INTERNAL);
  let slackContext = {};

  const sites = await dataAccess.getSitesWithLatestAudit(ALERT_TYPE, false);
  for (const site of sites) {
    const latest404AuditReports = site.getAudits();
    const { results, finalUrl } = process404LatestAudit(latest404AuditReports);
    if (results && results.length > 0) {
      if (!sentInitialMessage) {
        try {
          // eslint-disable-next-line no-await-in-loop
          slackContext = await sendInitial404Message(slackClient, { channel: slackChannelId });
          sentInitialMessage = true;
        } catch (e) {
          log.error(`Failed to send initial Slack message. Reason: ${e.message}`);
          return internalServerError('Failed to send initial Slack message');
        }
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        await send404Report(
          context,
          slackClient,
          slackContext,
          site.getBaseURL(),
          finalUrl,
          results,
        );
      } catch (e) {
        log.error(`Failed to send Slack message for ${site.getBaseURL()}. Reason: ${e.message}`);
      }
    }
  }
  return noContent();
}
