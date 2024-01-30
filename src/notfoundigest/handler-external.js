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
import { SlackClient, SLACK_TARGETS } from '@adobe/spacecat-shared-slack-client';
import {
  process404LatestAudit, send404Report, sendInitial404Message,
} from '../support/notfound.js';
import {
  getSlackContextForAlert, isDigestReport,
} from '../support/config.js';
import { removeDefaultOrg } from '../support/organization.js';

const ALERT_TYPE = '404';

export default async function notFoundExternalDigestHandler(message, context) {
  const { dataAccess, log } = context;

  const organizations = await dataAccess.getOrganizations();
  const properOrganizations = removeDefaultOrg(organizations);
  let sentInitialMessage = false;
  for (const organization of properOrganizations) {
    const orgConfig = organization.getConfig();
    const organizationId = organization.getId();
    // eslint-disable-next-line no-await-in-loop
    const sites = await dataAccess.getSitesByOrganizationIDWithLatestAudits(
      organizationId,
      ALERT_TYPE,
      false,
    );
    let slackContext = {};
    for (const site of sites) {
      const latest404AuditReports = site.getAudits();
      const { results, finalUrl } = process404LatestAudit(latest404AuditReports);
      if (results && results.length > 0) {
        const siteConfig = site.getConfig();
        const slackClient = SlackClient.createFrom(context, SLACK_TARGETS.ADOBE_EXTERNAL);
        const isDigest = isDigestReport(orgConfig, ALERT_TYPE);
        if (!isDigest || !sentInitialMessage) {
          slackContext = getSlackContextForAlert(orgConfig, siteConfig, ALERT_TYPE);
        }
        if (!sentInitialMessage && isDigest) {
          try {
            // eslint-disable-next-line no-await-in-loop
            slackContext = await sendInitial404Message(slackClient, slackContext);
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
  }
  return noContent();
}
