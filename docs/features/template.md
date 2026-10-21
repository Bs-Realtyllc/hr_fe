# Fill Details Mail Template

**Status:** released (~100%)

**Last updated:** 2026-09-19 — from commit cf1441e

## What it does
This function generates a mail template to notify users to fill out their details accurately for onboarding.

## Where it lives in the UI
This functionality is used by the backend API to generate the mail template, which is then sent via an API call to the frontend.

## Known limitations / in-progress
- The function currently only supports sending the mail through a regular mailto link.
- The function does not currently include the ability to update the mail body dynamically based on user input.
- The function does not validate the input parameters, so it may fail to compile if invalid data is provided.
