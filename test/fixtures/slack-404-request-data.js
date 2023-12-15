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

export const slack404RequestData = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'For *space.cat*, 3 page(s) had 404s *last week* for the real users.\n More information is below (up to three pages):',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: *<https://www.adobe.com/tr/creativecloud/animation/discover/cgi-animation.html|https://www.adobe.com/tr/creativecloud/animation/discover/cgi-animation.html>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 1,300',
      },
      {
        type: 'mrkdwn',
        text: ':mag: *Source:* https://www.google.com/',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: *<https://www.adobe.com/sea/|https://www.adobe.com/sea/>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 800',
      },
      {
        type: 'mrkdwn',
        text: ':mag: *Source:* https://www.bing.com/',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: *<https://www.adobe.com/express/|https://www.adobe.com/express/>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 500',
      },
      {
        type: 'mrkdwn',
        text: ':mag: *Source:* https://www.snapchat.com/',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*To access the full report <https://main--franklin-dashboard--adobe.hlx.live/views/404-report?interval=7&offset=0&limit=100&url=www.space.cat&domainkey=scoped-domain-key|click here> :link:* _(expires in 7 days)_',
    },
  },
];

export const slack404RequestDataWithoutBacklink = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'For *space.cat*, 3 page(s) had 404s *last week* for the real users.\n More information is below (up to three pages):',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: *<https://www.adobe.com/tr/creativecloud/animation/discover/cgi-animation.html|https://www.adobe.com/tr/creativecloud/animation/discover/cgi-animation.html>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 1,300',
      },
      {
        type: 'mrkdwn',
        text: ':mag: *Source:* https://www.google.com/',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: *<https://www.adobe.com/sea/|https://www.adobe.com/sea/>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 800',
      },
      {
        type: 'mrkdwn',
        text: ':mag: *Source:* https://www.bing.com/',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: *<https://www.adobe.com/express/|https://www.adobe.com/express/>*',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: ':mag: *Pageviews:* 500',
      },
      {
        type: 'mrkdwn',
        text: ':mag: *Source:* https://www.snapchat.com/',
      },
    ],
  },
];
