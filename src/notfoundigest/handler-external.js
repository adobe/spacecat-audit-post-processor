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
import { isObject } from '@adobe/spacecat-shared-utils';
import { build404SlackMessage, post404InitialSlackMessage, postSlackMessage } from '../support/slack.js';
import { get404Backlink } from '../support/utils.js';

const ALERT_TYPE = '404';

export default async function notFoundExternalDigestHandler(message, context) {
  const { dataAccess, log } = context;
  const {
    env: {
      SLACK_BOT_TOKEN: token,
    },
  } = context;

  const organizations = await dataAccess.getOrganizations();
  for (const organization of organizations) {
    const orgConfig = organization.getConfig();

    const notFoundOrgAlertConfig = orgConfig.alerts.find((alert) => alert.type === ALERT_TYPE);
    const organizationId = organization.getId();
    // eslint-disable-next-line no-await-in-loop
    const sites = await dataAccess.getSitesByOrganizationID(organizationId);
    let slackContext = {};
    for (const site of sites) {
      // eslint-disable-next-line no-await-in-loop
      const latest404AuditReport = await dataAccess.getLatestAuditForSite(site.getId(), ALERT_TYPE);
      if (isObject(latest404AuditReport)) {
        const { finalUrl, result } = latest404AuditReport.state.auditResult;
        // eslint-disable-next-line no-await-in-loop
        const backlink = await get404Backlink(context, finalUrl);
        if (notFoundOrgAlertConfig?.byOrg) {
          const { channel } = orgConfig.slack;
          const mentions = notFoundOrgAlertConfig.mentions[0].slack;
          // eslint-disable-next-line no-await-in-loop
          slackContext = await post404InitialSlackMessage(token, channel, mentions);
          slackContext = { ...slackContext, mentions };
        } else {
          const siteConfig = site.getConfig();
          slackContext.channel = siteConfig.slack.channel;
          const notFoundSiteAlertConfig = siteConfig.alerts.find(
            (alert) => alert.type === ALERT_TYPE,
          );
          slackContext.mentions = notFoundSiteAlertConfig.mentions[0].slack;
        }
        try {
          // send alert to the slack channel - group under a thread if ts value exists
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
          return internalServerError(`Failed to send Slack message for ${site.getBaseURL()}}`);
        }
      }
    }
  }

  return noContent();
}
