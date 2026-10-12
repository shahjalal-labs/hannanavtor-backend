export const onboardingHtml = async ({ fullName, accountLink }: any) => {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; color: #333; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #2d87f0; text-align: center; font-size: 24px; font-weight: bold;">Complete Your Onboarding</h2>
    
      <p style="font-size: 16px; line-height: 1.5;">Dear <b style="color: #2d87f0;">${fullName}</b>,</p>
    
      <p style="font-size: 16px; line-height: 1.5;">We’re thrilled to have you onboard! To get started, please complete your onboarding process by clicking the button below:</p>
    
      <div style="text-align: center; margin: 20px 0;">
        <a href="${accountLink}" style="background-color: #2d87f0; color: #fff; padding: 14px 24px; border-radius: 5px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          Complete Onboarding
        </a>
      </div>
    
      <p style="font-size: 16px; line-height: 1.5;">If the button above doesn’t work, you can also copy and paste this link into your browser:</p>
      <p style="font-size: 14px; line-height: 1.5; word-wrap: break-word; background-color: #f4f4f4; padding: 12px; border-radius: 5px; margin: 15px 0; border: 1px solid #ddd; color: #007bff;">
        ${accountLink}
      </p>
    
      <p style="font-size: 16px; line-height: 1.5;"><b>Note:</b> This link is valid for a limited time. Please complete your onboarding as soon as possible.</p>
    
      <p style="font-size: 16px; line-height: 1.5;">Thank you for choosing us!</p>
      <p style="font-size: 16px; line-height: 1.5;"><b>The Support Team</b></p>
    
      <hr style="border: 0; height: 1px; background: #ddd; margin: 30px 0;">
      <p style="font-size: 12px; color: #777; text-align: center;">
        If you didn’t request this, please ignore this email or contact our support team.
      </p>
    </div>
  `;
  return html;
};
