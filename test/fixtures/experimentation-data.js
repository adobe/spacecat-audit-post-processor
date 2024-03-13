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

export const expectedAuditResult = {
  result: [
    {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system',
      p_value: 0.004,
      variant: 'challenger-1',
      variant_experimentation_events: 13,
      variant_conversion_events: 3,
      variant_experimentations: null,
      variant_conversions: null,
      variant_conversion_rate: null,
      time5: '2024-02-01 17:00:19+00',
      time95: '2024-02-07 20:00:55+00',
    },
    {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system',
      p_value: 0.07,
      variant: 'challenger-2',
      variant_experimentation_events: 13,
      variant_conversion_events: 3,
      variant_experimentations: null,
      variant_conversions: null,
      variant_conversion_rate: null,
      time5: '2024-02-01 17:00:19+00',
      time95: '2024-02-07 20:00:55+00',
    },
    {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system1',
      p_value: null,
      variant: 'challenger-2',
      variant_experimentation_events: 13,
      variant_conversion_events: 3,
      variant_experimentations: null,
      variant_conversions: null,
      variant_conversion_rate: null,
      time5: '2024-02-01 17:00:19+00',
      time95: '2024-02-07 20:00:55+00',
    },
    {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system1',
      p_value: 0.004,
      variant: 'control',
      variant_experimentation_events: 11,
      variant_conversion_events: 3,
      variant_experimentations: '1100',
      variant_conversions: '300',
      variant_conversion_rate: '0.272727273',
      time5: '2024-02-01 00:00:08+00',
      time95: '2024-02-07 23:00:58+00',
    },
    {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system2',
      p_value: 0.07,
      variant: 'challenger-2',
      variant_experimentation_events: 50000,
      variant_conversion_events: 1,
      variant_experimentations: 5000000,
      variant_conversions: '100',
      variant_conversion_rate: null,
      time5: '2024-02-01 17:00:19+00',
      time95: '2024-02-07 20:00:55+00',
    },
    {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system2',
      p_value: 0.064,
      variant: 'control',
      variant_experimentation_events: 50000,
      variant_conversion_events: 1,
      variant_experimentations: '5000000',
      variant_conversions: '100',
      variant_conversion_rate: '0.272727273',
      time5: '2024-02-01 00:00:08+00',
      time95: '2024-02-07 23:00:58+00',
    },
    {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system3',
      p_value: 0.07,
      variant: 'challenger-2',
      variant_experimentation_events: 1,
      variant_conversion_events: 1,
      variant_experimentations: 100,
      variant_conversions: '100',
      variant_conversion_rate: null,
      time5: '2024-02-01 17:00:19+00',
      time95: '2024-02-07 20:00:55+00',
    },
    {
      experiment: '24-101c-lp-enhanced-applicant-tracking-system3',
      p_value: 0.064,
      variant: 'control',
      variant_experimentation_events: 1,
      variant_conversion_events: 1,
      variant_experimentations: '100',
      variant_conversions: '100',
      variant_conversion_rate: '0.272727273',
      time5: '2024-02-01 00:00:08+00',
      time95: '2024-02-07 23:00:58+00',
    },
    {
      experiment: '24-101a-lp-enhanced-onboarding',
      p_value: 0.04,
      variant: 'challenger-1',
      variant_experimentation_events: 23,
      variant_conversion_events: 8,
      variant_experimentations: '2300',
      variant_conversions: '800',
      variant_conversion_rate: '0.347826087',
      time5: '2024-02-01 13:00:04+00',
      time95: '2024-02-07 21:00:08+00',
    },
    {
      experiment: '24-101a-lp-enhanced-onboarding',
      p_value: 0.09,
      variant: 'challenger-2',
      variant_experimentation_events: 31,
      variant_conversion_events: 3,
      variant_experimentations: '3100',
      variant_conversions: '300',
      variant_conversion_rate: '0.096774194',
      time5: '2024-02-01 15:00:13+00',
      time95: '2024-02-07 20:00:18+00',
    },
    {
      experiment: '2-21-free-trial-cp-delay-load',
      p_value: 0.1,
      variant: 'challenger-1',
      variant_experimentation_events: 24,
      variant_conversion_events: 2,
      variant_experimentations: '2400',
      variant_conversions: '200',
      variant_conversion_rate: '0.833333333',
      time5: '2024-02-01 00:00:08+00',
      time95: '2024-02-07 23:00:12+00',
    },
    {
      experiment: '2-21-free-trial-cp-delay-load',
      p_value: 0.47701597063430096,
      variant: 'challenger-2',
      variant_experimentation_events: 24,
      variant_conversion_events: 1,
      variant_experimentations: '2400',
      variant_conversions: '100',
      variant_conversion_rate: '0.541666667',
      time5: '2024-02-01 18:00:00+00',
      time95: '2024-02-07 19:00:09+00',
    },
    {
      experiment: '2-21-free-trial-cp-delay-load1',
      p_value: 0.01,
      variant: 'challenger-1',
      variant_experimentation_events: 24,
      variant_conversion_events: 2,
      variant_experimentations: '2400',
      variant_conversions: '200',
      variant_conversion_rate: '0.833333333',
      time5: '2024-02-01 00:00:08+00',
      time95: '2024-02-07 23:00:12+00',
    },
    {
      experiment: '2-21-free-trial-cp-delay-load1',
      p_value: 0.04701597063430096,
      variant: 'challenger-2',
      variant_experimentation_events: 24,
      variant_conversion_events: 3,
      variant_experimentations: '2400',
      variant_conversions: '300',
      variant_conversion_rate: '0.541666667',
      time5: '2024-02-01 18:00:00+00',
      time95: '2024-02-07 19:00:09+00',
    },
  ],
};

export const rumData = {
  ':names': [
    'results',
    'meta',
  ],
  ':type': 'multi-sheet',
  ':version': 3,
  results: {
    limit: 6,
    offset: 0,
    total: 6,
    data: [
      {
        experiment: '24-101c-lp-enhanced-applicant-tracking-system',
        variant: 'challenger-2',
        tdiff: 6,
        variant_experimentation_events: 13,
        control_experimentation_events: 0,
        variant_conversion_events: 3,
        control_conversion_events: 0,
        variant_experimentations: '1300',
        control_experimentations: '0',
        variant_conversions: '300',
        control_conversions: '0',
        variant_conversion_rate: '0.230769231',
        control_conversion_rate: '0',
        topurl: 'https://www.bamboohr.com/pl-pages/applicant-tracking-system-a2',
        time95: '2024-02-07 20:00:55+00',
        time5: '2024-02-01 17:00:19+00',
        pooled_sample_proportion: 0.23076923076923078,
        pooled_standard_error: null,
        test: null,
        p_value: 0.5000000005,
        remaining_runtime: 494,
      },
      {
        experiment: '24-101c-lp-enhanced-applicant-tracking-system',
        variant: 'challenger-1',
        tdiff: 6,
        variant_experimentation_events: 11,
        control_experimentation_events: 0,
        variant_conversion_events: 3,
        control_conversion_events: 0,
        variant_experimentations: '1100',
        control_experimentations: '0',
        variant_conversions: '300',
        control_conversions: '0',
        variant_conversion_rate: '0.272727273',
        control_conversion_rate: '0',
        topurl: 'https://www.bamboohr.com/pl-pages/applicant-tracking-system-a1',
        time95: '2024-02-07 23:00:58+00',
        time5: '2024-02-01 00:00:08+00',
        pooled_sample_proportion: 0.2727272727272727,
        pooled_standard_error: null,
        test: null,
        p_value: 0.5000000005,
        remaining_runtime: 494,
      },
      {
        experiment: '24-101a-lp-enhanced-onboarding',
        variant: 'challenger-1',
        tdiff: 6,
        variant_experimentation_events: 23,
        control_experimentation_events: 0,
        variant_conversion_events: 8,
        control_conversion_events: 0,
        variant_experimentations: '2300',
        control_experimentations: '0',
        variant_conversions: '800',
        control_conversions: '0',
        variant_conversion_rate: '0.347826087',
        control_conversion_rate: '0',
        topurl: 'https://www.bamboohr.com/pl-pages/onboarding-c1',
        time95: '2024-02-07 21:00:08+00',
        time5: '2024-02-01 13:00:04+00',
        pooled_sample_proportion: 0.34782608695652173,
        pooled_standard_error: null,
        test: null,
        p_value: 0.5000000005,
        remaining_runtime: 267,
      },
      {
        experiment: '24-101a-lp-enhanced-onboarding',
        variant: 'challenger-2',
        tdiff: 6,
        variant_experimentation_events: 31,
        control_experimentation_events: 0,
        variant_conversion_events: 3,
        control_conversion_events: 0,
        variant_experimentations: '3100',
        control_experimentations: '0',
        variant_conversions: '300',
        control_conversions: '0',
        variant_conversion_rate: '0.096774194',
        control_conversion_rate: '0',
        topurl: 'https://www.bamboohr.com/pl-pages/onboarding-c2',
        time95: '2024-02-07 20:00:18+00',
        time5: '2024-02-01 15:00:13+00',
        pooled_sample_proportion: 0.0967741935483871,
        pooled_standard_error: null,
        test: null,
        p_value: 0.5000000005,
        remaining_runtime: 267,
      },
      {
        experiment: '2-21-free-trial-cp-delay-load',
        variant: 'challenger-1',
        tdiff: 6,
        variant_experimentation_events: 24,
        control_experimentation_events: 20,
        variant_conversion_events: 20,
        control_conversion_events: 10,
        variant_experimentations: '2400',
        control_experimentations: '2000',
        variant_conversions: '2000',
        control_conversions: '1000',
        variant_conversion_rate: '0.833333333',
        control_conversion_rate: '0.5',
        topurl: 'https://www.bamboohr.com/signup/c1',
        time95: '2024-02-07 23:00:12+00',
        time5: '2024-02-01 00:00:08+00',
        pooled_sample_proportion: 0.6818181818181818,
        pooled_standard_error: 0.8254647450373558,
        test: 0.40381292478446823,
        p_value: 0.3431751933689274,
        remaining_runtime: 64,
      },
      {
        experiment: '2-21-free-trial-cp-delay-load',
        variant: 'challenger-2',
        tdiff: 6,
        variant_experimentation_events: 24,
        control_experimentation_events: 20,
        variant_conversion_events: 13,
        control_conversion_events: 10,
        variant_experimentations: '2400',
        control_experimentations: '2000',
        variant_conversions: '1300',
        control_conversions: '1000',
        variant_conversion_rate: '0.541666667',
        control_conversion_rate: '0.5',
        topurl: 'https://www.bamboohr.com/signup/c2',
        time95: '2024-02-07 19:00:09+00',
        time5: '2024-02-01 18:00:00+00',
        pooled_sample_proportion: 0.5227272727272727,
        pooled_standard_error: 0.7228255661993029,
        test: 0.05764415226634547,
        p_value: 0.47701597063430096,
        remaining_runtime: 64,
      },
    ],
    columns: [
      'experiment',
      'variant',
      'tdiff',
      'variant_experimentation_events',
      'control_experimentation_events',
      'variant_conversion_events',
      'control_conversion_events',
      'variant_experimentations',
      'control_experimentations',
      'variant_conversions',
      'control_conversions',
      'variant_conversion_rate',
      'control_conversion_rate',
      'topurl',
      'time95',
      'time5',
      'pooled_sample_proportion',
      'pooled_standard_error',
      'test',
      'p_value',
      'remaining_runtime',
    ],
  },
  meta: {
    limit: 13,
    offset: 0,
    total: 13,
    columns: [
      'name',
      'value',
      'type',
    ],
    data: [
      {
        name: 'description',
        value: 'Using Helix RUM data, get a report of conversion rates of experiment variants compared to control, including p value.',
        type: 'query description',
      },
      {
        name: 'url',
        value: 'www.bamboohr.com',
        type: 'request parameter',
      },
      {
        name: 'interval',
        value: 7,
        type: 'request parameter',
      },
      {
        name: 'offset',
        value: 0,
        type: 'request parameter',
      },
      {
        name: 'startdate',
        value: '-',
        type: 'request parameter',
      },
      {
        name: 'enddate',
        value: '-',
        type: 'request parameter',
      },
      {
        name: 'timezone',
        value: 'UTC',
        type: 'request parameter',
      },
      {
        name: 'experiment',
        value: '-',
        type: 'request parameter',
      },
      {
        name: 'conversioncheckpoint',
        value: 'click',
        type: 'request parameter',
      },
      {
        name: 'sources',
        value: '-',
        type: 'request parameter',
      },
      {
        name: 'targets',
        value: '-',
        type: 'request parameter',
      },
      {
        name: 'threshold',
        value: '500',
        type: 'request parameter',
      },
      {
        name: 'limit',
        value: null,
        type: 'request parameter',
      },
    ],
  },
};

export const formattedSlackMessage = [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'For *space.cat*, 7 experiments have been run in the *last week*.\n More information is below :',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: The Experiment 24-101c-lp-enhanced-applicant-tracking-system has been running for nearly 6 days with 2 variants.',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-1 shows a conversion rate of 0 %. The statistical confidence 0.0040 is *highly significant*',
      },
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-2 shows a conversion rate of 0 %. The statistical confidence 0.070 is *marginally significant*',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Without significant traffic, this experiment is unlikely to conclude.',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: The Experiment 24-101c-lp-enhanced-applicant-tracking-system1 has been running for nearly 7 days with 2 variants.',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-2 shows a conversion rate of 0 %. The statistical confidence 0',
      },
      {
        type: 'mrkdwn',
        text: 'The *Variant:* control shows a conversion rate of 27.3 %. The statistical confidence 0.0040 is *highly significant*',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Stick with *control*. No variant is better than the control.',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: The Experiment 24-101c-lp-enhanced-applicant-tracking-system2 has been running for nearly 7 days with 2 variants.',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-2 shows a conversion rate of 0 %. The statistical confidence 0.070 is *marginally significant*',
      },
      {
        type: 'mrkdwn',
        text: 'The *Variant:* control shows a conversion rate of 27.3 %. The statistical confidence 0.064 is *marginally significant*',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Not yet enough data to determine a winner. Keep going until you get 25M page views.',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: The Experiment 24-101c-lp-enhanced-applicant-tracking-system3 has been running for nearly 7 days with 2 variants.',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-2 shows a conversion rate of 0 %. The statistical confidence 0.070 is *marginally significant*',
      },
      {
        type: 'mrkdwn',
        text: 'The *Variant:* control shows a conversion rate of 27.3 %. The statistical confidence 0.064 is *marginally significant*',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Not yet enough data to determine a winner. Keep going until you get 500 page views.',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: The Experiment 24-101a-lp-enhanced-onboarding has been running for nearly 6 days with 2 variants.',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-1 shows a conversion rate of 34.8 %. The statistical confidence 0.040 is *significant*',
      },
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-2 shows a conversion rate of 9.68 %. The statistical confidence 0.090 is *marginally significant*',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'No significant difference between variants. In doubt, stick with *control*',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: The Experiment 2-21-free-trial-cp-delay-load has been running for nearly 7 days with 2 variants.',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-1 shows a conversion rate of 83.3 %. The statistical confidence 0.10 is *not significant*',
      },
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-2 shows a conversion rate of 54.2 %. The statistical confidence 0.48 is *not significant*',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Not yet enough data to determine a winner. Keep going until you get 8K page views.',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':arrow-red2: The Experiment 2-21-free-trial-cp-delay-load1 has been running for nearly 7 days with 2 variants.',
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-1 shows a conversion rate of 83.3 %. The statistical confidence 0.010 is *significant*',
      },
      {
        type: 'mrkdwn',
        text: 'The *Variant:* challenger-2 shows a conversion rate of 54.2 %. The statistical confidence 0.047 is *significant*',
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'challenger-2 is the winner.',
    },
  },
];
