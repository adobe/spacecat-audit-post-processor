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

import { uploadSlackFile } from './slack.js';

export function convertListToCSV(array) {
  const headers = Object.keys(array[0]).join(',');
  const rows = array.map((item) => Object.values(item).map((value) => {
    if (typeof value === 'object' && value !== null) {
      return `"${JSON.stringify(value)}"`;
    }
    return `"${value}"`;
  }).join(',')).join('\r\n');
  return `${headers}\r\n${rows}\r\n`;
}

async function notifyBrokenBacklinksAuditResult(url, result, file, slackContext, token, log) {
  try {
    const urlWithProtocolStripped = url?.replace(/^(https?:\/\/)/, '');
    const urlWithDotsAndSlashesReplaced = urlWithProtocolStripped?.replace(/\./g, '-')?.replace(/\//g, '-');
    const fileName = `broken-backlinks-${urlWithDotsAndSlashesReplaced}-${new Date().toISOString().split('T')[0]}.csv`;
    const text = `For *${urlWithProtocolStripped}*, ${result?.brokenBacklinks?.length} broken backlink(s) were detected.\nThe following CSV file contains a detailed report for all broken backlinks:`;

    // TODO: use new Slack client
    const { channel, ts } = slackContext;
    await uploadSlackFile(token, {
      file, fileName, channel, ts, text,
    });

    log.info(`Successfully reported broken backlinks for ${url}`);
  } catch (e) {
    log.error(`Failed to send slack message to report broken backlinks for ${url}. Reason: ${e.message}`);
  }
}

export async function processBrokenBacklinksAuditResult(auditResult, slackContext, token, log) {
  return Promise.all(Object.keys(auditResult).map(async (url) => {
    const result = auditResult[url];
    const { brokenBacklinks, error } = result;

    if (error) {
      log.warn(`Not reporting broken backlinks: ${error}`);
      return;
    }

    if (!brokenBacklinks || brokenBacklinks.length === 0) {
      log.info(`No broken backlinks detected for ${url}`);
      return;
    }

    const csvData = convertListToCSV(brokenBacklinks);
    log.info(`Converted to csv ${csvData}`);
    const file = new Blob([csvData], { type: 'text/csv' });

    await notifyBrokenBacklinksAuditResult(url, result, file, slackContext, token, log);
  }));
}

export const INITIAL_BACKLINKS_SLACK_MESSAGE = '*BROKEN BACKLINKS REPORT* for the *last week* :thread:';
