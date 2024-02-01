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

import { AUDIT_TYPE_BROKEN_BACKLINKS } from '@adobe/spacecat-shared-data-access/src/models/audit.js';
import { internalServerError, noContent } from '@adobe/spacecat-shared-http-utils';
import { SLACK_TARGETS, SlackClient } from '@adobe/spacecat-shared-slack-client';
import { buildInitialSlackMessage } from '../support/slack.js';
import { INITIAL_BACKLINKS_SLACK_MESSAGE, processBrokenBacklinksAuditResult } from '../support/backlinks.js';

export default async function brokenBacklinksInternalHandler(message, context) {
  const {
    env: {
      AUDIT_REPORT_SLACK_CHANNEL_ID: slackChannelId,
      SLACK_BOT_TOKEN: token,
    }, dataAccess, log,
  } = context;
  const slackClient = SlackClient.createFrom(context, SLACK_TARGETS.ADOBE_INTERNAL);
  let slackContext = {};
  try {
    const blocks = buildInitialSlackMessage(INITIAL_BACKLINKS_SLACK_MESSAGE);
    const { channelId, threadId } = await slackClient.postMessage(
      {
        channel: slackChannelId,
        blocks,
      },
    );
    slackContext = { channel: channelId, thread_ts: threadId };
  } catch (e) {
    log.error(`Failed to send initial Slack message. Reason: ${e.message}`);
    return internalServerError('Failed to send initial Slack message');
  }

  const sites = await dataAccess.getSitesWithLatestAudit(AUDIT_TYPE_BROKEN_BACKLINKS, false);

  await Promise.all(sites.map(async (site) => {
    const latestSiteAuditOfType = site.getAudits();
    if (!latestSiteAuditOfType || latestSiteAuditOfType.length === 0) {
      log.info(`No audit of type ${AUDIT_TYPE_BROKEN_BACKLINKS} found for ${site.getBaseURL()}`);
      return;
    }
    if (latestSiteAuditOfType.length > 1) {
      log.info(`Multiple latest audits of type ${AUDIT_TYPE_BROKEN_BACKLINKS} found for ${site.getBaseURL()}`);
      return;
    }

    // TODO: logic to process multiple latest audits maybe not needed for broken backlinks
    const auditResult = latestSiteAuditOfType[0].getAuditResult();

    await processBrokenBacklinksAuditResult(auditResult, slackContext, token, log);
  }));

  return noContent();
}
