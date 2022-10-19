# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## v0.7.0 [2022-10-19]

### Added

 * Add the `log-public-key` input that can be used to turn off logging key identities (#122)

### Fixed

 * Fix path to `git` binary on Windows, assuming GitHub-hosted runners (#136, #137)
 * Fix a nonsensical log message (#139)

## v0.6.0 [2022-10-19]

### Changed

 * Update the version of Node used by the action from 12 to 16 (https://github.blog/changelog/2022-09-22-github-actions-all-actions-will-begin-running-on-node16-instead-of-node12/).

## v0.5.4 [2021-11-21]

### Fixed

 * Update changed GitHub Host Keys (#102, #101)

### Changed

 * Various documentation (README) improvements and additions
 * Change logging to more precisely state that _public_ keys are being printed

## v0.5.3 [2021-06-11]

### Fixed

 * Fixed cleanup phase to really terminate the ssh-agent (#80)
 * Fix termination of ssh-agent also on workflow failure (#79)

### Changed

 * Various documentation (README) improvements and additions

## v0.5.2 [2021-04-07]

### Fixed

 * Use case-insensitive regex matching when scanning key comments (#68, #70, #71)

### Changed

 * Log when a key is _not_ used as a deploy key (#69)

## v0.5.1 [2021-03-10]

### Fixed

 * Fix deployment key mapping on Windows virtual environment by using SSH binaries from the Git
   suite, terminate ssh-agent upon actio termination on Windows as well (#63)
 * Handle ENOENT exceptions with a graceful message

### Changed

 * Various documentation (README) improvements and additions

## v0.5.0 [2021-02-19]

### Added

 * Add support for GitHub Deployment Keys through key comments (#59). Fixes #30, closes #38.
 * Support for container-based workflows and Windows (#17)

### Fixed

 * Fix scripts/build.js to work on Windows (#38)

### Changed

 * Various documentation (README) improvements and additions

## v0.4.1 [2020-10-07]

### Fixed

* This action no longer relies on `set-env`, which has been deprecated.

## v0.4.0

### Changed

* A failure to kill the agent in the post-action step will no longer fail the workflow run. That way, you can kill the agent yourself when necessary (#33).

## v0.3.0 [2020-05-18]

### Added 

* A new post-action step will automatically clean up the running agent at the end of a job. This helps with self-hosted runners, which are non-ephemeral. (@thommyhh, #27)

### Changed

* Unless the SSH_AUTH_SOCK is configured explicitly, the SSH agent will now use a random file name for the socket. That way, multiple, concurrent SSH agents can be used on self-hosted runners. (@thommyhh, #27)

## v0.2.0 [2020-01-14]

### Added

* Multiple SSH keys can now be provided (#14, closes #7). Thanks to
  @webknjaz and @bradmartin for support and tests.

* Catch empty ssh-private-key input values and exit with a helpful
  error message right away.

## v0.1.0 [2019-09-15]

Initial release.
