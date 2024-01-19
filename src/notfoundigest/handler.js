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

import { noContent } from '@adobe/spacecat-shared-http-utils';
import { postSlackMessage } from '../support/slack.js';

const ALERT_TYPE = '404';
export const INITIAL_404_SLACK_MESSAGE = '*404 REPORT* for the *last week* :thread:';

export default async function notFoundDigestHandler(message, context) {
  const { dataAccess, sqs } = context;
  const {
    env: { AUDIT_JOBS_QUEUE_URL: queueUrl, SLACK_BOT_TOKEN: token },
  } = context;

  const organizations = await dataAccess.getOrganizations();
  for (const organization of organizations) {
    const config = organization.getConfig();

    const notFoundAlertConfig = config.alerts.find((alert) => alert.type === ALERT_TYPE);
    const organizationId = organization.getId();
    // eslint-disable-next-line no-await-in-loop
    const sites = await dataAccess.getSitesByOrganizationID(organizationId);
    for (const site of sites) {
      // create a backlink to rum dashboard to be included in alert message
      const { channel } = config.slack;
      if (notFoundAlertConfig.byOrg) {
        // eslint-disable-next-line no-await-in-loop
        const thread = await postSlackMessage(token, {
          channel,
          blocks: JSON.stringify([
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: INITIAL_404_SLACK_MESSAGE,
              },
            },
          ]),
        });
        const mentions = notFoundAlertConfig.mentions[0].slack;
        // eslint-disable-next-line no-await-in-loop
        await sqs.sendMessage(queueUrl, {
          type: ALERT_TYPE,
          url: site.getBaseURL(),
          auditContext: { slackContext: { thread, channel, mentions } },
        });
      } else {
        // eslint-disable-next-line no-await-in-loop
        await sqs.sendMessage(queueUrl, {
          type: ALERT_TYPE,
          url: site.getBaseURL(),
        });
      }
    }
  }

  return noContent();
}
