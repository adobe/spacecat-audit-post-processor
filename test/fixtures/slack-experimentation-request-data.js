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
      text: 'For *space.cat*, 6 experiments have been run in the *last week*.\n More information is below :',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: * Experiment - 24-101c-lp-enhanced-applicant-tracking-system| Period - 2024-02-01 17:00:19+00 to 2024-02-07 20:00:55+00 | Confidence - 0.5000000005 | Events - 1300 | Conversion - 300 | Conversion Rate - 0.230769231 *',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: * Experiment - 24-101c-lp-enhanced-applicant-tracking-system| Period - 2024-02-01 00:00:08+00 to 2024-02-07 23:00:58+00 | Confidence - 0.5000000005 | Events - 1100 | Conversion - 300 | Conversion Rate - 0.272727273 *',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: * Experiment - 24-101a-lp-enhanced-onboarding| Period - 2024-02-01 13:00:04+00 to 2024-02-07 21:00:08+00 | Confidence - 0.5000000005 | Events - 2300 | Conversion - 800 | Conversion Rate - 0.347826087 *',
    },
  },
];
