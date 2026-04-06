const { passwordVerfication } = require('@/emailTemplate/emailVerfication');
const { Resend } = require('resend');
const { withTimeout, withRetry, createBreaker } = require('@/utils/resilience');

const resend = new Resend(process.env.RESEND_API);

const resendBreaker = createBreaker(
  'resend',
  (payload) => withTimeout(() => resend.emails.send(payload), 8_000, 'resend'),
  { resetTimeout: 60_000 }
);

const sendMail = async ({
  email,
  name,
  link,
  idurar_app_email,
  subject = 'Verify your email | idurar',
  type = 'emailVerfication',
  emailToken,
}) => {
  const { data } = await withRetry(
    () => resendBreaker.fire({ from: idurar_app_email, to: email, subject, html: passwordVerfication({ name, link }) }),
    { attempts: 3, baseDelayMs: 300, label: 'resend' }
  );

  return data;
};

module.exports = sendMail;
