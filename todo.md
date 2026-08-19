# Approved Remediation Work

- [x] Inventory committed secrets and required runtime environment variables.
- [x] Remove hard-coded credentials and require environment-based configuration.
- [x] Restrict or disable the public pairing and session-download flow.
- [x] Add safe archive extraction rules with path, size, and file-count limits.
- [x] Pin the supported Node runtime and make container installs lockfile-reproducible.
- [x] Add targeted security and startup regression tests.
- [x] Run clean-install, syntax, test, and build-equivalent validation before push.

## Deployment Blocker Follow-up

- [x] Reproduce the Railway-equivalent startup sequence with the configured owner value.
- [x] Identify the first runtime failure without exposing session or API secrets.
- [x] Support safe legacy session archive layouts that contain nested session folders.
- [x] Apply a compatibility fix that retains fail-closed pairing and session controls.
- [x] Run the full regression suite and confirm startup reaches the WhatsApp runtime.
- [ ] Push the corrective commit and provide exact redeployment instructions.

## Active Production Incident

- [ ] Confirm the source commit selected by the current Railway deployment.
- [ ] Capture the current restore-session and WhatsApp authentication log sequence.
- [ ] Distinguish an outdated deployment from invalid or expired WhatsApp session data.
- [ ] Apply the smallest safe correction and verify a working WhatsApp response.

## Session Recovery

- [ ] Temporarily enable the protected pairing flow with a new strong pairing token.
- [ ] Pair the WhatsApp account and replace all existing session archive variables.
- [ ] Verify that the deployment restores at least one session file and reaches WhatsApp authentication.
- [ ] Disable pairing again and test a bot command from WhatsApp.

## Owner Number Validation Regression

- [x] Reproduce validation using the Egypt-format owner number configured in Railway.
- [x] Adjust the owner-number validator to accept a valid international number without country-code truncation.
- [x] Add a regression test for the accepted Egypt-format number and invalid owner values.
- [ ] Push the correction and verify startup passes the configuration gate.
