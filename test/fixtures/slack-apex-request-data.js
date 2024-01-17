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

export const slackApexRequestData = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'One of your domains is experiencing issues. Requests to *<https://www.adobe.com/|https://www.adobe.com/>* work, but *fail* for *<https://adobe.com/|https://adobe.com/>*. Confirm redirection settings according to your preference.',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Failure to address this promptly may lead to SEO implications. Act swiftly to prevent possible loss of organic traffic.',
    },
  },
];

export const slackAllFailsRequestData = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Your domains are experiencing issues. Requests to both *<https://adobe.com/|https://adobe.com/>* and *<https://www.adobe.com/|https://www.adobe.com/>* *fail*. Confirm redirection settings according to your preference.',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Failure to address this promptly may lead to SEO implications. Act swiftly to prevent possible loss of organic traffic.',
    },
  },
];
