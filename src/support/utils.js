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

/* c8 ignore next 3 */
export const { fetch } = process.env.HELIX_FETCH_FORCE_HTTP1
  ? h1()
  : h2();

/**
 * Converts an array of objects to a CSV string.
 *
 * Each object in the array represents a row in the CSV.
 * The keys of the first object in the array are used as column headers.
 * The function handles nested objects, converting them to JSON strings.
 * All values, including nested objects, are enclosed in double quotes.
 *
 * @param {Object[]} array - An array of objects to be converted into CSV format.
 * @returns {string} A string in CSV format, where the first row contains the headers.
 */
export function convertToCSV(array) {
  const headers = Object.keys(array[0]).join(',');
  const rows = array.map((item) => Object.values(item).map((value) => {
    if (typeof value === 'object' && value !== null) {
      return `"${JSON.stringify(value)}"`;
    }
    return `"${value}"`;
  }).join(',')).join('\r\n');
  return `${headers}\r\n${rows}\r\n`;
}
