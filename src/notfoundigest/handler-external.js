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
import { SlackClient, SLACK_TARGETS } from '@adobe/spacecat-shared-slack-client';
import {
  build404InitialSlackMessage,
  build404SlackMessage,
} from '../support/slack.js';
import {
  get404Backlink,
  process404LatestAudit,
} from '../support/notfound.js';
import { getSlackContextForAlert, isConfigByOrgForAlert } from '../support/config.js';

const ALERT_TYPE = '404';

export default async function notFoundExternalDigestHandler(message, context) {
  const { dataAccess, log } = context;

  const organizations = await dataAccess.getOrganizations();
  for (const organization of organizations) {
    const orgConfig = organization.getConfig();
    if (isObject(orgConfig)) {
      const organizationId = organization.getId();
      // eslint-disable-next-line no-await-in-loop
      const sites = await dataAccess.getSitesByOrganizationIDWithLatestAudits(
        organizationId,
        ALERT_TYPE,
        false,
      );
      if (sites.length > 0) {
        const slackClient = SlackClient.createFrom(context, SLACK_TARGETS.ADOBE_EXTERNAL);
        const isConfigByOrg = isConfigByOrgForAlert(orgConfig, ALERT_TYPE, log);
        let slackContext = {};
        if (isConfigByOrg) {
          slackContext = getSlackContextForAlert(orgConfig, ALERT_TYPE);
          try {
            const blocks = build404InitialSlackMessage(slackContext.mentions);
            // eslint-disable-next-line no-await-in-loop
            const { threadId } = await slackClient.postMessage(
              {
                channel: slackContext.channel,
                blocks,
              },
            );
            slackContext.thread_ts = threadId;
          } catch (e) {
            log.error(`Failed to send initial Slack message. Reason: ${e.message}`);
            return internalServerError('Failed to send initial Slack message');
          }
        }
        for (const site of sites) {
          const latest404AuditReports = site.getAudits();
          log.info(JSON.stringify(latest404AuditReports));
          const { results, finalUrl } = process404LatestAudit(latest404AuditReports);
          if (results.length > 0) {
            if (!isConfigByOrg) {
              const siteConfig = site.getConfig();
              slackContext = getSlackContextForAlert(siteConfig, ALERT_TYPE);
            }
            try {
              if (results && results.length > 0) {
                // eslint-disable-next-line no-await-in-loop
                const backlink = await get404Backlink(context, finalUrl);
                const blocks = build404SlackMessage(
                  site.getBaseURL(),
                  results,
                  backlink,
                  slackContext?.mentions,
                );
                // send alert to the slack channel - group under a thread if ts value exists
                // eslint-disable-next-line no-await-in-loop
                await slackClient.postMessage({ ...slackContext, blocks, unfurl_links: false });
              }
            } catch (e) {
              log.error(`Failed to send Slack message for ${site.getBaseURL()}. Reason: ${e.message}`);
            }
          }
        }
      }
    }
  }

  return noContent();
}