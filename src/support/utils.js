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
import fs from 'fs';

const PROMPT_FILENAME = './static/prompts/firefall.prompt';

/* c8 ignore next 3 */
export const { fetch } = process.env.HELIX_FETCH_FORCE_HTTP1
  ? h1()
  : h2();

/**
 * Reads the content of a prompt file and replaces any placeholders with the corresponding values.
 * If an error occurs during the process, it logs the error and returns null.
 *
 * @param {Object} placeholders - A JSON object containing values to replace in the prompt content.
 * @param {Object} log - The logger
 *
 * @returns {Promise<string|null>} - A promise that resolves to a string with the prompt content.
 * . If an error occurs, it resolves to null.
 */
export async function getPrompt(placeholders, log = console) {
  try {
    let prompt = fs.readFileSync(PROMPT_FILENAME, { encoding: 'utf8', flag: 'r' });
    prompt = prompt.replace(/{{(.*?)}}/g, (match, key) => (key in placeholders ? placeholders[key] : match));
    return prompt;
  } catch (error) {
    log.error('Error reading prompt file:', error.message);
    return null;
  }
}
