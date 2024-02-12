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
import { BaseSlackClient, SLACK_TARGETS } from '@adobe/spacecat-shared-slack-client';
import { sendBasicMessage } from '../support/slack.js';

export default async function internalDigestHandler(
  context,
  type,
  INITIAL_MESSAGE,
  processLatestAudit,
  sendReport,
) {
  const {
    env: { AUDIT_REPORT_SLACK_CHANNEL_ID: slackChannelId }, dataAccess, log,
  } = context;
  let sentInitialMessage = false;
  const slackClient = BaseSlackClient.createFrom(context, SLACK_TARGETS.WORKSPACE_INTERNAL);
  let slackContext = {};

  const sites = await dataAccess.getSitesWithLatestAudit(type, false);
  for (const site of sites) {
    const latestAuditReports = site.getAudits();
    const message = processLatestAudit(context, site, latestAuditReports);
    if (Object.keys(message).length > 0) {
      if (!sentInitialMessage) {
        try {
          // eslint-disable-next-line no-await-in-loop
          slackContext = await sendBasicMessage(
            slackClient,
            { channel: slackChannelId },
            INITIAL_MESSAGE,
          );
          sentInitialMessage = true;
        } catch (e) {
          log.error(`Failed to send initial Slack message. Reason: ${e.message}`);
          return internalServerError('Failed to send initial Slack message');
        }
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        await sendReport({
          slackClient,
          slackContext,
          message,
        });
      } catch (e) {
        log.error(`Failed to send Slack message for ${site.getBaseURL()}. Reason: ${e.message}`);
      }
    }
  }
  return noContent();
}
