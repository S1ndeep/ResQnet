# Twilio SMS Integration

This file documents the Twilio configuration, SMS format, webhook setup, and testing steps for the Crisis Connect backend.

## Environment variables

Add these to `backend/.env` (do not commit `.env` to source control):

- TWILIO_ACCOUNT_SID - Your Twilio Account SID (starts with `AC...`)
- TWILIO_AUTH_TOKEN - Your Twilio Auth Token
- TWILIO_PHONE_NUMBER - The Twilio phone number (in E.164 format) used to send messages
- ADMIN_PHONE_NUMBERS - Comma-separated list of admin phone numbers to notify, e.g. `+15551234567,+15557654321`

Other relevant env vars already used by the project:

- MONGODB_URI - MongoDB connection string
- PORT - Server port

## SMS format

To create a structured incident via SMS, reporters should send a message in the following format:

INCIDENT: [type] at [location] - [description]

Example:

INCIDENT: Flooding at 123 Main St - Water rising rapidly, people stranded on the roof

The parser used by the backend extracts `type`, `location`, and `description`. If the message does not match the expected pattern, the system replies with an instruction message describing the expected format.

## Webhook endpoint

The Twilio webhook endpoint exposed by the backend is:

POST /api/twilio/sms

Twilio expects an HTTPS URL. For local testing, use a tunneling tool like `ngrok` to expose your local server over HTTPS.

## Testing locally with ngrok

1. Start your backend server (from project root):

```powershell
cd backend
npm run start
```

2. Start ngrok to forward your local port (replace 5000 with your `PORT` if different):

```powershell
ngrok http 5000
```

3. In the ngrok output copy the HTTPS forwarding URL (e.g., `https://abcd1234.ngrok.io`).

4. In the Twilio Console, set the phone number's "Messaging" webhook (when a message comes in) to:

```
POST https://abcd1234.ngrok.io/api/twilio/sms
```

5. Send an SMS to your Twilio phone number using the format above. The backend will respond with TwiML (XML) confirming receipt.

## Simulating webhook with curl / PowerShell (no Twilio signing)

If you just want to test parsing and database behavior without Twilio signing validation, simulate a POST to the endpoint:

```powershell
# Example PowerShell snippet
$body = @{ From = "+15550001111"; Body = "INCIDENT: Flooding at 123 Main St - Water rising rapidly, need help" }
Invoke-RestMethod -Method Post -Uri "https://abcd1234.ngrok.io/api/twilio/sms" -ContentType "application/x-www-form-urlencoded" -Body $body
```

If testing directly against `http://localhost:5000` (without TLS), note that Twilio will not accept non-HTTPS endpoints; use ngrok for integration testing with Twilio.

## Notes on Twilio client initialization

- The backend's Twilio client will only initialize if `TWILIO_ACCOUNT_SID` appears valid (starts with `AC` and matches the typical SID pattern). This prevents the server failing to start due to malformed credentials during development.
- If the client is not configured, admin SMS notifications will be skipped and a warning will be logged.

## Security

- Rotate Twilio Auth Tokens immediately if they were shared publicly.
- Never commit `.env` to version control. Use environment configuration in your deployment (Azure Key Vault, AWS Secrets Manager, etc.) in production.

## Troubleshooting

- If you get errors about Twilio initialization, check `TWILIO_ACCOUNT_SID` format and `TWILIO_AUTH_TOKEN` correctness.
- If TwiML responses are not being returned, enable request logging and check `backend/server.js` logs for incoming requests.

## Next steps / Enhancements

- Add an admin UI to manage `ADMIN_PHONE_NUMBERS` rather than using `.env`.
- Add Twilio request signature validation bypass option for dev/test environments.
- Add unit tests for the SMS parser (e.g., Jest tests for regex matching).
