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
export const getSlackContextForAlert = (conf, alertType) => {
  const alertConfig = conf.alerts.find((alert) => alert.type === alertType);
  const mentions = alertConfig.mentions[0].slack;
  const { channel } = conf.slack;
  return { channel, mentions };
};

export const isConfigByOrgForAlert = (conf, alertType, log) => {
  const alertConfig = conf.alerts.find((alert) => alert.type === alertType);
  log.info(`Config is ${JSON.stringify(alertConfig)}`);
  return alertConfig.byOrg;
};
