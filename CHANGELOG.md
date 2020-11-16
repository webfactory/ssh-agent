# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
