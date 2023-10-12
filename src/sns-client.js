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
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { log } from './util.js';

const REGION = 'us-east-1';
const snsClient = new SNSClient({ region: process.env.REGION });
const topicArn = process.env.SNS_TOPIC;

function SNSAuditClient() {
  async function sendNotification(message) {
    // Set up the parameters for the publish command
    const params = {
      Message: message,
      TopicArn: topicArn,
    };

    try {
      const data = await snsClient.send(new PublishCommand(params));
      log('info', `Message sent to the topic, ${data.MessageId}`);
    } catch (err) {
      log('error', `Error:, ${err}`);
      throw err;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'SNS notification sent!' }),
    };
  }
  return { sendNotification };
}

export default SNSAuditClient;
