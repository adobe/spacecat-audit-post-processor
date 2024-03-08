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

import {
  getSlackContextForAlert, hasAlertConfig, isDigestReport,
} from '../support/config.js';
import { sendInitialMessage } from '../support/slack.js';

export default async function externalDigestHandler(
  context,
  type,
  INITIAL_MESSAGE,
  processLatestAudit,
  sendReport,
) {
  const { dataAccess, log } = context;

  const organizations = await dataAccess.getOrganizations();
  let sentInitialMessage = false;
  const slackClient = BaseSlackClient.createFrom(context, SLACK_TARGETS.WORKSPACE_EXTERNAL);

  for (const organization of organizations) {
    const orgConfig = organization.getConfig();
    if (hasAlertConfig(orgConfig, type)) {
      const organizationId = organization.getId();
      // eslint-disable-next-line no-await-in-loop
      const sites = await dataAccess.getSitesByOrganizationIDWithLatestAudits(
        organizationId,
        type,
        false,
      );
      let slackContext = {};
      for (const site of sites) {
        const latestAuditReports = site.getAudits();
        const message = processLatestAudit(context, site, latestAuditReports);
        if (Object.keys(message).length > 0) {
          const siteConfig = site.getConfig();
          const isDigest = isDigestReport(orgConfig, type);
          if (!isDigest || !sentInitialMessage) {
            slackContext = getSlackContextForAlert(orgConfig, siteConfig, type);
          }
          if (!sentInitialMessage && isDigest) {
            try {
              // eslint-disable-next-line no-await-in-loop
              slackContext = await sendInitialMessage(slackClient, slackContext, INITIAL_MESSAGE);
              sentInitialMessage = true;
            } catch (e) {
              log.error(`Failed to send initial Slack message for ${site.getBaseURL()} to ${JSON.stringify(slackContext)}. Reason: ${e.message}`);
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
            log.error(`Failed to send Slack message for ${site.getBaseURL()} to ${JSON.stringify(slackContext)}. Reason: ${e.message}`);
          }
        }
      }
    }
  }
  return noContent();
}
