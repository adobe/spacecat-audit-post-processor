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
import { isArray } from '@adobe/spacecat-shared-utils';
import { convertToCSV, isWithinDays } from '../support/utils.js';

export const ALERT_TYPE = 'broken-backlinks';

export const INITIAL_BROKEN_BACKLINKS_SLACK_MESSAGE = '*BROKEN BACKLINKS REPORT* for the *last week* :thread:';

export const sendBrokenBacklinksReport = async ({
  message: {
    finalUrl,
    brokenBacklinks,
  },
  slackClient,
  slackContext,
}) => {
  const csvData = convertToCSV(brokenBacklinks);
  const file = Buffer.from(csvData, 'utf-8');

  const urlWithProtocolStripped = finalUrl?.replace(/^(https?:\/\/)/, '');
  const urlWithDotsAndSlashesReplaced = urlWithProtocolStripped?.replace(/\./g, '-')?.replace(/\//g, '-');
  const filename = `broken-backlinks-${urlWithDotsAndSlashesReplaced}-${new Date().toISOString().split('T')[0]}.csv`;
  const text = `For *${urlWithProtocolStripped}*, ${brokenBacklinks?.length} broken backlink(s) were detected.\nThe following CSV file contains a detailed report for all broken backlinks:`;

  // send alert to the Slack channel - group under a thread if ts value exists
  await slackClient.fileUpload({
    mentions: slackContext?.mentions,
    thread_ts: slackContext?.thread_ts,
    channel_id: slackContext?.channel,
    file,
    filename,
    initial_comment: `${isArray(slackContext?.mentions)
      ? slackContext?.mentions.join(' ').toString() : ''} ${text}`,
    unfurl_links: false,
  });
};

export const processLatestBrokenBacklinksAudit = (context, site, latestAudits) => {
  if (latestAudits.length === 0) {
    return {};
  }
  const latestAudit = latestAudits[0];
  if (isWithinDays(latestAudit.getAuditedAt(), 7)) {
    const auditResult = latestAudit.getAuditResult();
    const { brokenBacklinks, finalUrl, fullAuditRef } = auditResult;
    if (brokenBacklinks.length > 0) {
      return {
        brokenBacklinks, finalUrl, fullAuditRef, baseUrl: site.getBaseURL(), context,
      };
    }
  }
  return {};
};
