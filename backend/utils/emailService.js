const nodemailer = require('nodemailer');

// Create transporter (using Gmail as example - configure in .env)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Alternative: Use SMTP directly (more flexible)
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT || 587,
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS
//   }
// });

/**
 * Send email notification when a volunteer claims a request
 */
async function sendClaimNotificationEmail(civilian, volunteer, request) {
  try {
    // Skip if email is not configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email service not configured. Skipping email notification.');
      return { success: false, message: 'Email service not configured' };
    }

    if (!civilian.email) {
      console.log('Civilian email not available. Skipping email notification.');
      return { success: false, message: 'Civilian email not available' };
    }

    const mailOptions = {
      from: `"Crisis Connect" <${process.env.EMAIL_USER}>`,
      to: civilian.email,
      subject: 'Your Crisis Connect Alert has been Claimed!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00b7ff 0%, #00d4ff 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .alert-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00b7ff; }
            .volunteer-info { background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #00b7ff; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Help is on the Way!</h1>
            </div>
            <div class="content">
              <p>Dear ${civilian.name},</p>
              
              <div class="alert-box">
                <h2>Good News!</h2>
                <p><strong>A volunteer has claimed your emergency alert and is responding to help you.</strong></p>
              </div>

              <div class="volunteer-info">
                <h3>Volunteer Details:</h3>
                <p><strong>Name:</strong> ${volunteer.name}</p>
                ${volunteer.email ? `<p><strong>Email:</strong> ${volunteer.email}</p>` : ''}
                ${volunteer.phone ? `<p><strong>Phone:</strong> ${volunteer.phone}</p>` : ''}
              </div>

              <div class="alert-box">
                <h3>Your Alert Details:</h3>
                <p><strong>Title:</strong> ${request.title}</p>
                <p><strong>Priority:</strong> ${request.priority}</p>
                <p><strong>Category:</strong> ${request.category}</p>
                ${request.location.address ? `<p><strong>Location:</strong> ${request.location.address}</p>` : ''}
              </div>

              <p><strong>Please be ready to communicate with the volunteer and provide any additional information they may need.</strong></p>

              <p>Stay safe and help is on the way!</p>

              <div class="footer">
                <p>This is an automated message from Crisis Connect</p>
                <p>For support, contact: support@crisisconnect.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email notification to all volunteers when an incident is verified
 */
async function sendIncidentVerificationEmail(volunteerEmails, incident) {
  try {
    // Skip if email is not configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email service not configured. Skipping email notification.');
      return { success: false, message: 'Email service not configured' };
    }

    if (!volunteerEmails || volunteerEmails.length === 0) {
      console.log('No volunteer emails available. Skipping email notification.');
      return { success: false, message: 'No volunteer emails available' };
    }

    const severityText = {
      1: 'Very Low',
      2: 'Low',
      3: 'Medium',
      4: 'High',
      5: 'Very High'
    }[incident.severity] || 'Unknown';

    const googleMapsUrl = `https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`;

    const mailOptions = {
      from: `"Disaster Management System" <${process.env.EMAIL_USER}>`,
      to: volunteerEmails.join(','), // Send to all volunteers at once
      subject: `🚨 New Verified Incident Alert - ${incident.type}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .incident-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
            .severity-${incident.severity} { background: ${incident.severity >= 4 ? '#ffe6e6' : incident.severity >= 3 ? '#fff3cd' : '#e8f4f8'}; }
            .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 New Verified Incident Alert</h1>
            </div>
            <div class="content">
              <p>Dear Volunteer,</p>
              
              <div class="incident-box severity-${incident.severity}">
                <h2>A new incident has been verified and requires your attention!</h2>
                
                <h3>Incident Details:</h3>
                <p><strong>Type:</strong> ${incident.type}</p>
                <p><strong>Location:</strong> ${incident.location}</p>
                <p><strong>Severity:</strong> ${severityText} (${incident.severity}/5)</p>
                <p><strong>Description:</strong> ${incident.description}</p>
                <p><strong>Reported By:</strong> ${incident.reportedBy?.name || 'Unknown'}</p>
                <p><strong>Coordinates:</strong> ${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}</p>
                
                <a href="${googleMapsUrl}" class="button">📍 View on Google Maps</a>
              </div>

              <p><strong>Admin will assign tasks based on volunteer skills and availability. Please check your dashboard for assigned tasks.</strong></p>

              <p>Thank you for your service!</p>

              <div class="footer">
                <p>This is an automated message from Disaster Management System</p>
                <p>For support, contact your system administrator</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully to volunteers:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendClaimNotificationEmail,
  sendIncidentVerificationEmail
};



