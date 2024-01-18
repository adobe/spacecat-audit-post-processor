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
      text: 'One of your domains is encountering difficulties. While requests to *<https://www.adobe.com/|https://www.adobe.com/>* are successful :checked:, those to *<https://adobe.com/|https://adobe.com/>* fail :red:.',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Please verify and adjust the redirection settings as per your requirements. Delay in resolving this issue could result in SEO repercussions, potentially leading to a decrease in organic traffic. Prompt action is advised to mitigate this risk.',
    },
  },
];

export const slackAllFailsRequestData = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Your domains are encountering difficulties. Requests to both *<https://adobe.com/|https://adobe.com/>* and *<https://www.adobe.com/|https://www.adobe.com/>* *fail* :red:',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Please verify and adjust the redirection settings as per your requirements. Delay in resolving this issue could result in SEO repercussions, potentially leading to a decrease in organic traffic. Prompt action is advised to mitigate this risk.',
    },
  },
];
