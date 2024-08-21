# SpaceCat Audit Post-Processor

> Consumes completed audit events and post-processes them (e.g. to send alerts & notifications).

## Deprecation notice
This repository will be deprecated once the apex/lhs/sitemap alerts are migrated and should not be further enhanced.

Sending reports is now handled by the [SpaceCat Reporting Worker](https://github.com/adobe/spacecat-reporting-worker).

Post-processing for the audits can now be done using the 
[SpaceCat Audit Post-Processors](https://github.com/adobe/spacecat-audit-worker/blob/main/src/common/audit.js#L123-L126).

Post-processing for the content scraped should be done using the 
[SpaceCat Content Processor](https://github.com/adobe/spacecat-content-processor).

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe-rnd/spacecat-audit-post-processor.svg)](https://codecov.io/gh/adobe-rnd/spacecat-audit-post-processor)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe-rnd/spacecat-audit-post-processor.svg)](https://circleci.com/gh/adobe-rnd/spacecat-audit-post-processor)
[![GitHub license](https://img.shields.io/github/license/adobe-rnd/spacecat-audit-post-processor.svg)](https://github.com/adobe-rnd/spacecat-audit-post-processor/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe-rnd/spacecat-audit-post-processor.svg)](https://github.com/adobe-rnd/spacecat-audit-post-processor/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe-rnd/spacecat-audit-post-processor.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe-rnd/spacecat-audit-post-processor)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

```bash
$ npm install @adobe/spacecat-audit-post-processor
```

## Usage

See the [API documentation](docs/API.md).

## Development

### Build

```bash
$ npm install
```

### Test

```bash
$ npm test
```

### Lint

```bash
$ npm run lint
```
