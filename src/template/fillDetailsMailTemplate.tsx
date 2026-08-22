interface BuildFillDetailsMailtoParams {
  to: string;
  name: string;
  onboardUrl?: string;
}

export function buildFillDetailsMailto({ to, name, onboardUrl }: BuildFillDetailsMailtoParams) {
  const firstName = name?.split(' ')[0] || 'there';

  const subject = 'Please fill all details accurately';

  const body = `Hi ${firstName},

Thanks for starting your onboarding with us! Before we can move forward, please make sure all the information in your form is filled out completely and accurately — this includes your personal, educational, and professional details.

Accurate details help us set up your records correctly and avoid delays in processing your application.${onboardUrl ? `\n\nYou can update your details here: ${onboardUrl}` : ''}

If anything is unclear or you have questions, just reply to this email.

Thanks,
The Gitgi HR Team`;

  const mailtoLink = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoLink };
}