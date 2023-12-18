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

export const slackRumRequestData = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'For *space.cat*, 3 page(s) had CWV over threshold in the *last week* for the real users.\n More information is below (up to three pages):',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-green: *<https://www.adobe.com/|https://www.adobe.com/>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 36,064,271',
      },
      {
        type: 'mrkdwn',
        text: ':green: *LCP:* 1.23 s',
      },
      {
        type: 'mrkdwn',
        text: ':yellow: *CLS:* 0.148',
      },
      {
        type: 'mrkdwn',
        text: ':gray-circle: *INP:* 0 ms',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-green: *<https://www.adobe.com/express/feature/image/remove-background|https://www.adobe.com/express/feature/image/remove-background>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 2,737,380',
      },
      {
        type: 'mrkdwn',
        text: ':green: *LCP:* 1.42 s',
      },
      {
        type: 'mrkdwn',
        text: ':green: *CLS:* 0.029',
      },
      {
        type: 'mrkdwn',
        text: ':yellow: *INP:* 295 ms',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-green: *<https://www.adobe.com/express/|https://www.adobe.com/express/>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 2,703,493',
      },
      {
        type: 'mrkdwn',
        text: ':yellow: *LCP:* 2.87 s',
      },
      {
        type: 'mrkdwn',
        text: ':green: *CLS:* 0.028',
      },
      {
        type: 'mrkdwn',
        text: ':green: *INP:* 79 ms',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*To access the full report <https://main--franklin-dashboard--adobe.hlx.live/views/rum-dashboard?interval=7&offset=0&limit=100&url=www.space.cat&domainkey=scoped-domain-key|click here> :link:* _(expires in 7 days)_',
    },
  },
];

export const slackRUMRequestDataWithoutBacklink = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'For *space.cat*, 3 page(s) had CWV over threshold in the *last week* for the real users.\n More information is below (up to three pages):',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-green: *<https://www.adobe.com/|https://www.adobe.com/>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 36,064,271',
      },
      {
        type: 'mrkdwn',
        text: ':green: *LCP:* 1.23 s',
      },
      {
        type: 'mrkdwn',
        text: ':yellow: *CLS:* 0.148',
      },
      {
        type: 'mrkdwn',
        text: ':gray-circle: *INP:* 0 ms',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-green: *<https://www.adobe.com/express/feature/image/remove-background|https://www.adobe.com/express/feature/image/remove-background>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 2,737,380',
      },
      {
        type: 'mrkdwn',
        text: ':green: *LCP:* 1.42 s',
      },
      {
        type: 'mrkdwn',
        text: ':green: *CLS:* 0.029',
      },
      {
        type: 'mrkdwn',
        text: ':yellow: *INP:* 295 ms',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-green: *<https://www.adobe.com/express/|https://www.adobe.com/express/>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 2,703,493',
      },
      {
        type: 'mrkdwn',
        text: ':yellow: *LCP:* 2.87 s',
      },
      {
        type: 'mrkdwn',
        text: ':green: *CLS:* 0.028',
      },
      {
        type: 'mrkdwn',
        text: ':green: *INP:* 79 ms',
      },
    ],
  },
];
