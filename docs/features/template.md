# Fill Details Mail Template

**Status:** released (~100%)

**Last updated:** 2026-09-19 — from commit 278fbc5

## What it does
Generates a personalized email template for users to fill in their details accurately before proceeding with onboarding.

## Where it lives in the UI
The `buildFillDetailsMailto` function is called from a frontend component (`src/template/FillDetailsMailTemplate.tsx`). It is used within the onboarding process to send a customized email to users prompting them to complete their form details.

## Key flows
1. **User navigates to onboarding page.**
2. **User fills out their personal details.**
3. **User receives an email with a personalized subject and body to update their details.**

## Known limitations / in-progress
- Ensure all necessary information is filled out in the form.
- Verify that the email is successfully sent and contains the correct details.
- Add a mechanism to track and handle any errors or failures in sending the email.
