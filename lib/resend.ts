import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
const isPlaceholder = !resendApiKey || resendApiKey === "re_placeholder";

// Initialize Resend safely (mocked if placeholder)
const resend = isPlaceholder ? null : new Resend(resendApiKey);
const defaultSender = "onboarding@resend.dev"; // Default Resend test sender

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mock?: boolean;
}

/**
 * Sends a confirmation email to authors upon manuscript submission.
 */
export async function sendSubmissionConfirmation(
  toEmail: string,
  authorName: string,
  articleTitle: string,
  journalName: string
): Promise<EmailResult> {
  const subject = `Manuscript Submission Confirmed - ${journalName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg">
      <h2 style="color: #1e3a8a;">Submission Received</h2>
      <p>Dear ${authorName},</p>
      <p>Thank you for submitting your manuscript to the <strong>${journalName}</strong>. We have successfully received your files.</p>
      <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
        <strong>Title:</strong> ${articleTitle}
      </div>
      <p>Your paper will undergo plagiarism checking and editorial screening before being assigned to double-blind peer review. You can track your manuscript's progress on your author dashboard.</p>
      <p>Best regards,<br/>The Editorial Office<br/>${journalName}</p>
    </div>
  `;

  if (!resend) {
    console.log(`[Resend EMAIL MOCK]
      To: ${toEmail}
      Subject: ${subject}
      Body: Submission confirmation for "${articleTitle}"`);
    return { success: true, mock: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Editorial Office <${defaultSender}>`,
      to: [toEmail],
      subject: subject,
      html: html,
    });

    if (error) throw error;
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("Resend sendSubmissionConfirmation error:", err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Sends an email inviting a reviewer to inspect a manuscript.
 */
export async function sendReviewRequest(
  toEmail: string,
  reviewerName: string,
  articleTitle: string,
  journalName: string,
  dashboardUrl: string
): Promise<EmailResult> {
  const subject = `Review Invitation - ${journalName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg">
      <h2 style="color: #1e3a8a;">Review Invitation</h2>
      <p>Dear Dr. ${reviewerName},</p>
      <p>You have been invited to review the following manuscript for the <strong>${journalName}</strong>:</p>
      <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
        <strong>Title:</strong> ${articleTitle}
      </div>
      <p>Please log in to your reviewer dashboard to accept or decline the invitation and submit your comments.</p>
      <p style="margin-top: 25px;">
        <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 6px;">
          Go to Reviewer Dashboard
        </a>
      </p>
      <p>Best regards,<br/>The Editorial Team<br/>${journalName}</p>
    </div>
  `;

  if (!resend) {
    console.log(`[Resend EMAIL MOCK]
      To: ${toEmail}
      Subject: ${subject}
      Body: Review request for "${articleTitle}"`);
    return { success: true, mock: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Editorial Board <${defaultSender}>`,
      to: [toEmail],
      subject: subject,
      html: html,
    });

    if (error) throw error;
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("Resend sendReviewRequest error:", err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Sends the editorial decision outcome to the corresponding author.
 */
export async function sendEditorialDecision(
  toEmail: string,
  authorName: string,
  articleTitle: string,
  journalName: string,
  decision: "accepted" | "revision_requested" | "rejected",
  editorComments?: string
): Promise<EmailResult> {
  const decisionText = decision.replace("_", " ").toUpperCase();
  const subject = `Editorial Decision: ${decisionText} - ${journalName}`;
  
  let decisionBlock = "";
  if (decision === "accepted") {
    decisionBlock = `<p style="color: #16a34a; font-weight: bold;">We are pleased to inform you that your manuscript has been accepted for publication.</p>`;
  } else if (decision === "revision_requested") {
    decisionBlock = `<p style="color: #ea580c; font-weight: bold;">Our editors have reviewed your paper and requested revisions before a final decision can be made.</p>`;
  } else {
    decisionBlock = `<p style="color: #dc2626; font-weight: bold;">We regret to inform you that we are unable to accept your manuscript for publication in this journal.</p>`;
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg">
      <h2 style="color: #1e3a8a;">Editorial Decision</h2>
      <p>Dear ${authorName},</p>
      <p>Regarding your submission to the <strong>${journalName}</strong>:</p>
      <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
        <strong>Title:</strong> ${articleTitle}
      </div>
      ${decisionBlock}
      ${editorComments ? `
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <strong>Editor Comments:</strong><br/>
          <p style="white-space: pre-line; margin-top: 5px;">${editorComments}</p>
        </div>
      ` : ""}
      <p>Please refer to your author dashboard for full logs and file uploading for revisions.</p>
      <p>Best regards,<br/>The Editorial Team<br/>${journalName}</p>
    </div>
  `;

  if (!resend) {
    console.log(`[Resend EMAIL MOCK]
      To: ${toEmail}
      Subject: ${subject}
      Body: Editorial decision "${decisionText}" for "${articleTitle}"`);
    return { success: true, mock: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Editorial Office <${defaultSender}>`,
      to: [toEmail],
      subject: subject,
      html: html,
    });

    if (error) throw error;
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("Resend sendEditorialDecision error:", err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}
