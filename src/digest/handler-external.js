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
import { sendMessage } from '../support/slack.js';

export default async function externalDigestHandler(
  context,
  type,
  INITIAL_MESSAGE,
  processLatestAudit,
  sendReport,
  NO_DATA_MESSAGE,
) {
  const { dataAccess, log } = context;

  const organizations = await dataAccess.getOrganizations();
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
      const isDigest = isDigestReport(orgConfig, type);
      if (isDigest && sites.length > 0) {
        slackContext = getSlackContextForAlert(orgConfig, {}, type);
        try {
          // eslint-disable-next-line no-await-in-loop
          slackContext = await sendMessage(slackClient, slackContext, INITIAL_MESSAGE);
        } catch (e) {
          log.error(`Failed to send initial Slack message. Reason: ${e.message}`);
          return internalServerError('Failed to send initial Slack message');
        }
      }
      for (const site of sites) {
        const latestAuditReports = site.getAudits();
        const siteConfig = site.getConfig();
        if (!isDigest) {
          slackContext = getSlackContextForAlert(orgConfig, siteConfig, type);
        }
        const message = processLatestAudit(context, site, latestAuditReports);
        if (Object.keys(message).length > 0) {
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
        } else {
          try {
            // eslint-disable-next-line no-await-in-loop
            await sendMessage(slackClient, slackContext, NO_DATA_MESSAGE(site.getBaseURL()));
          } catch (e) {
            log.error(`Failed to send Slack message for ${site.getBaseURL()}. Reason: ${e.message}`);
          }
        }
      }
    }
  }
  return noContent();
}
