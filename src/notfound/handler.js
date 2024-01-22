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

import RUMAPIClient from '@adobe/spacecat-shared-rum-api-client';
import { hasText, isArray } from '@adobe/spacecat-shared-utils';
import { badRequest, internalServerError, noContent } from '@adobe/spacecat-shared-http-utils';
import commaNumber from 'comma-number';
import { postSlackMessage, markdown, section } from '../support/slack.js';

const ALERT_TYPE = '404';

function isValidMessage(message) {
  return hasText(message.url);
}
async function getBacklink(context, url) {
  try {
    const rumApiClient = RUMAPIClient.createFrom(context);
    return await rumApiClient.create404Backlink(url, 7);
  } catch (e) {
    context.log.warn(`Failed to get a backlink for ${url}`);
    return null;
  }
}

function buildSlackMessage(url, finalUrl, auditResult, backlink, mentions) {
  const blocks = [];

  blocks.push(section({
    text: markdown(`${isArray(mentions) ? mentions.join(' ').toString() : ''} For *${url}*, ${auditResult.length} page(s) had 404s *last week* for the real users.\n More information is below (up to three pages):`),
  }));

  for (let i = 0; i < Math.min(3, auditResult.length); i += 1) {
    const topLine = section({
      text: markdown(`:arrow-red2: *<${auditResult[i].url}|${auditResult[i].url}>*`),
    });

    const stats = section({
      fields: [
        markdown(`:mag: *Pageviews:* ${commaNumber(auditResult[i].pageviews)}`),
        markdown(`:mag: *Source:* ${commaNumber(auditResult[i].source)}`),
      ],
    });

    blocks.push(topLine);
    blocks.push(stats);
  }

  if (backlink) {
    blocks.push(section({
      text: markdown(`*To access the full report <${backlink}|click here> :link:* _(expires in 7 days)_`),
    }));
  }

  return blocks;
}

function getSlackContext(site, dataAccess, auditContext) {
  if (auditContext.slackContext) {
    return auditContext.slackContext;
  }
  let config = site.getConfig();
  if (config?.slack?.channel) {
    const notFoundAlertConfig = config.alerts.find((alert) => alert.type === ALERT_TYPE);
    return { channel: config?.slack?.channel, mentions: notFoundAlertConfig?.mentions[0]?.slack };
  }
  const organizationId = site.getOrganizationId();
  const organization = dataAccess.getOrganizationByID(organizationId);
  config = organization.getConfig();
  if (config?.slack?.channel) {
    const notFoundAlertConfig = config.alerts.find((alert) => alert.type === ALERT_TYPE);
    return { channel: config?.slack?.channel, mentions: notFoundAlertConfig?.mentions[0]?.slack };
  }
  return {};
}

export default async function notFoundHandler(message, context) {
  const { url, auditContext } = message;
  const { log, env: { SLACK_BOT_TOKEN: token }, dataAccess } = context;

  if (!isValidMessage(message)) {
    return badRequest('Required parameters missing in the message body');
  }
  const site = await dataAccess.getSiteByBaseURL(url);
  const latest404AuditReport = await site.getLatestAuditForSite(site.getId(), ALERT_TYPE);

  const slackContext = getSlackContext(site, dataAccess, auditContext);

  // create a backlink to rum dashboard to be included in alert message
  const backlink = await getBacklink(context, latest404AuditReport.finalUrl);
  try {
    // send alert to the slack channel - group under a thread if ts value exists
    await postSlackMessage(token, {
      blocks: buildSlackMessage(
        url,
        latest404AuditReport.finalUrl,
        latest404AuditReport,
        backlink,
        slackContext.mentions,
      ),
      slackContext,
    });
  } catch (e) {
    log.error(`Failed to send Slack message for ${url}. Reason: ${e.message}`);
    return internalServerError(`Failed to send Slack message for ${url}`);
  }

  log.info(`Slack notification sent for ${url}`);

  return noContent();
}
