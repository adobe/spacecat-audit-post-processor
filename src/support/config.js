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

export const isDigestReport = (conf, alertType) => {
  const alertConfig = isArray(conf?.alerts)
    ? conf?.alerts.find((alert) => alert.type === alertType)
    : {};
  return alertConfig?.byOrg;
};
const getSlackContext = (conf, alertType) => {
  const channel = conf?.slack?.channel;
  const alertConfig = isArray(conf?.alerts)
    ? conf?.alerts.find((alert) => alert.type === alertType)
    : {};
  const mentions = isArray(alertConfig?.mentions) && alertConfig.mentions.length > 0 ? alertConfig?.mentions[0].slack : '';
  return { channel, mentions };
};
export const getSlackContextForAlert = (orgConf, siteConf, alertType) => {
  if (isDigestReport(orgConf, alertType)) {
    return getSlackContext(orgConf, alertType);
  }
  return getSlackContext(siteConf, alertType);
};
