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
import { noContent } from '@adobe/spacecat-shared-http-utils';
import { build404SlackMessage, post404InitialSlackMessage, postSlackMessage } from '../support/slack.js';
import { get404Backlink } from '../support/utils.js';

const ALERT_TYPE = '404';

export default async function notFoundInternalDigestHandler(message, context) {
  const {
    env: {
      SLACK_BOT_TOKEN: token, AUDIT_REPORT_SLACK_CHANNEL_ID: slackChannelId,
    }, dataAccess,
  } = context;
  const rumApiClient = RUMAPIClient.createFrom(context);
  const urls = await rumApiClient.getDomainList();
  const slackContext = await post404InitialSlackMessage(token, slackChannelId);
  for (const domainUrl of urls) {
    // eslint-disable-next-line no-await-in-loop
    // eslint-disable-next-line no-await-in-loop
    const site = await dataAccess.getSiteByBaseURL(`https://${domainUrl}`);
    // eslint-disable-next-line no-await-in-loop
    const latest404AuditReport = await dataAccess.getLatestAuditForSite(site.getId(), ALERT_TYPE);
    const { finalUrl, result } = latest404AuditReport.state.auditResult;
    // eslint-disable-next-line no-await-in-loop
    const backlink = await get404Backlink(context, finalUrl);
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
  }

  return noContent();
}
