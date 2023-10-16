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

import axios from 'axios';
import { log } from './util.js';

function SlackClient() {
  const WEBHOOK_URL = 'https://hooks.slack.com/services/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';

  /**
   * Sends a notification to a Slack channel using a webhook.
   *
   * @param {string} message - The message to send to Slack.
   * @returns {Promise<void>}
   */
  async function sendNotification(message) {
    if (!WEBHOOK_URL) {
      throw new Error('Slack webhook URL is not defined.');
    }

    try {
      await axios.post(WEBHOOK_URL, JSON.stringify({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ':alarm: *PERFORMANCE DEGRADATION DETECTED* :alarm:',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Performance Score:*\nMobile: ${message.scores.mobile.performance}\nDesktop: ${message.scores.desktop.performance}`,
              },
              {
                type: 'mrkdwn',
                text: '*Webpage:*\nadobe.com',
              },
              {
                type: 'mrkdwn',
                text: `*Last Audit:*\n${message.auditDate}`,
              },
              {
                type: 'mrkdwn',
                text: '*Github:*\ngithub.com',
              },
              {
                type: 'mrkdwn',
                text: `*Is Live:*\n${message.isLive ? 'Yes' : 'No'}`,
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: 'Fix',
                },
                style: 'primary',
                url: 'https://github.com',
              },
            ],
          },
        ],
      }));
      log('info', 'Notification sent to Slack successfully.');
    } catch (error) {
      log('error', 'Failed to send notification to Slack:', error.message);
      throw error;
    }
  }

  return { sendNotification };
}

export default SlackClient;
