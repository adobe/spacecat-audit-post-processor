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
import { context as h2, h1 } from '@adobe/fetch';
import { hasText } from '@adobe/spacecat-shared-utils';

const LANG_CODES = ['AB', 'AA', 'AF', 'SQ', 'AM', 'AR', 'HY', 'AS', 'AY', 'AZ', 'BA', 'EU', 'BN', 'DZ', 'BH', 'BI', 'BR', 'BG', 'MY', 'BE', 'KM', 'CA', 'ZH', 'CO', 'HR', 'CS', 'DA', 'NL', 'EN', 'EO', 'ET', 'FO', 'FJ', 'FI', 'FR', 'FY', 'GD', 'GL', 'KA', 'DE', 'EL', 'KL', 'GN', 'GU', 'HA', 'IW', 'HI', 'HU', 'IS', 'IN', 'IA', 'IE', 'IK', 'GA', 'IT', 'JA', 'JW', 'KN', 'KS', 'KK', 'RW', 'KY', 'RN', 'KO', 'KU', 'LO', 'LA', 'LV', 'LN', 'LT', 'MK', 'MG', 'MS', 'ML', 'MT', 'MI', 'MR', 'MO', 'MN', 'NA', 'NE', 'NO', 'OC', 'OR', 'OM', 'PS', 'FA', 'PL', 'PT', 'PA', 'QU', 'RM', 'RO', 'RU', 'SM', 'SG', 'SA', 'SR', 'SH', 'ST', 'TN', 'SN', 'SD', 'SI', 'SS', 'SK', 'SL', 'SO', 'ES', 'SU', 'SW', 'SV', 'TL', 'TG', 'TA', 'TT', 'TE', 'TH', 'BO', 'TI', 'TO', 'TS', 'TR', 'TK', 'TW', 'UK', 'UR', 'UZ', 'VI', 'VO', 'CY', 'WO', 'XH', 'JI', 'YO', 'ZU'];

/* c8 ignore next 3 */
export const { fetch } = process.env.HELIX_FETCH_FORCE_HTTP1
  ? h1()
  : h2();

export function getFilename(url, filenamePrefix, fileExtension) {
  const urlWithDotsAndSlashesReplaced = url?.replace(/\./g, '-')?.replace(/\//g, '-');
  return `${filenamePrefix}-${urlWithDotsAndSlashesReplaced}-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
}

export function convertToCSV(array) {
  if (array.length === 0) {
    return '';
  }

  const headers = Object.keys(array[0]).join(',');
  const rows = array.map((item) => Object.values(item).map((value) => {
    if (typeof value === 'object' && value !== null) {
      return `"${JSON.stringify(value)}"`;
    }
    return `"${value}"`;
  }).join(',')).join('\r\n');
  return `${headers}\r\n${rows}\r\n`;
}

export function isWithinDays(date, numDays) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - numDays);
  const checkedDate = new Date(date);
  return checkedDate >= sevenDaysAgo;
}

export function containsLangCode(token) {
  if (!hasText(token)) {
    return false;
  }
  const tokens = token.length > 2 ? token.split(/-|_/) : [token];
  return tokens.some((t) => LANG_CODES.includes(t.toUpperCase()));
}
