# Email Configuration Guide

To enable email notifications when volunteers claim requests, you need to configure email settings in your `.env` file.

## Setup Instructions

### Option 1: Gmail (Easiest)

1. Add these variables to `backend/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Important:** For Gmail, you need to:
- Enable 2-Factor Authentication on your Google account
- Generate an "App Password" (not your regular password)
- Use the App Password in `EMAIL_PASS`

### Option 2: SMTP (Any Email Provider)

1. Add these variables to `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

Then update `backend/utils/emailService.js` to use the SMTP configuration instead of the Gmail service.

## Current Status

The email service is **non-blocking**, meaning:
- If email is not configured, the system will continue to work normally
- If email fails to send, the claim will still succeed
- Errors are logged to the console but don't affect the API response

## Testing

To test email functionality:
1. Configure email settings in `.env`
2. Have a volunteer claim a request
3. Check the console logs for email status
4. Check the civilian's email inbox

## Disabling Email

If you don't want to use email notifications, simply don't set `EMAIL_USER` and `EMAIL_PASS` in your `.env` file. The system will skip email sending automatically.



