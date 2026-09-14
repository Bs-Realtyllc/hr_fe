```md
# Fill Details Mail Template

**Status:** released (~100% complete)

**Last updated:** 2026-09-14 — from commit e46a02a

## What it does
Generates a personalized email template for filling out a form to onboard new users, ensuring all personal, educational, and professional details are accurate.

## Where it lives in the UI
N/A

## Key flows
1. A user initiates the onboarding process and needs to fill out a form.
2. The system calls the `buildFillDetailsMailto` function, passing the necessary parameters such as the recipient's email, name, and optional onboarding URL.
3. The function constructs the email subject, body, and URL, then returns the mailto link for the user to use.

## Known limitations / in-progress
- The function handles basic email generation but does not provide additional context or validation for the form fields.
- The onboarding URL is optional and only included if provided, allowing the user to update their details directly through the email.
- The function assumes that the recipient's email will always be provided and does not include any input validation for the email address.
```
