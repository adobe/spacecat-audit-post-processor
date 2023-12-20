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

import { isValidUrl } from '@adobe/spacecat-shared-utils';

import { fetch } from './utils.js';

/**
 * Represents a utility for calculating content differences from Markdown files fetched via HTTP.
 *
 * @param {Object} log - The logger object.
 *
 * @returns {ContentClient} - The content client.
 */
function ContentClient(log = console) {
  /**
   * Returns the Markdown URL for a given content URL.
   * @param {string} contentUrl - The URL of the content page used in the audit.
   * @return {string} The Markdown URL.
   */
  function getMarkdownUrl(contentUrl) {
    const markdownUrl = new URL(contentUrl);
    const { pathname: path } = markdownUrl;

    markdownUrl.pathname = path.endsWith('/') ? `${path}index.md` : `${path}.md`;

    return markdownUrl.toString();
  }

  /**
   * Asynchronously fetches the Markdown content from a specified audit URL.
   *
   * @async
   * @param {string} baseURL - The baseURL of the audited site.
   * @param {string} contentUrl - The URL of the content page used in the audit.
   * @returns {Promise<Object|null>} A promise that resolves to an object containing the
   * Markdown content, or `null` if there was an error or the final URL was not found.
   * The object has the following shape:
   *   {
   *     content: string         // The Markdown content fetched from the final URL.
   *   }
   * @throws Will throw an error if there's a network issue or some other error while
   * downloading the Markdown content.
   */
  async function fetchMarkdown(baseURL, contentUrl) {
    let markdownContent = null;

    if (!isValidUrl(contentUrl)) {
      log.error('Final URL not found in the audit object.');
      return null;
    }

    const markdownUrl = getMarkdownUrl(contentUrl);

    try {
      const response = await fetch(markdownUrl.toString());
      if (!response.ok) {
        log.info(`Markdown content not found for site ${baseURL}: ${response.status}`);
        return null;
      }
      markdownContent = await response.text();

      log.info(`Downloaded Markdown content from ${markdownUrl} for site ${baseURL}`);
    } catch (err) {
      log.error(`Error while downloading Markdown content for site ${baseURL}:`, err);
      return null;
    }

    return {
      markdownContent,
    };
  }

  return {
    fetchMarkdown,
  };
}

export default ContentClient;
