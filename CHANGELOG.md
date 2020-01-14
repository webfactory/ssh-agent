# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

* Multiple SSH keys can now be provided (#14, closes #7). Thanks to
  @webknjaz and @bradmartin for support and tests.

* Catch empty ssh-private-key input values and exit with a helpful
  error message right away.
