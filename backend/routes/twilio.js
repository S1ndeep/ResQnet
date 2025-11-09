const express = require('express');
const router = express.Router();
const { MessagingResponse } = require('twilio').twiml;
const twilio = require('twilio');
const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const twilioClient = require('../utils/twilioClient');

// Middleware to validate Twilio requests
const validateTwilioRequest = twilio.webhook({ validate: true });

// POST /api/twilio/sms - Twilio webhook for incoming SMS
router.post('/sms', process.env.NODE_ENV === 'production' ? validateTwilioRequest : (req, res, next) => next(), async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;

  try {
    console.log('Received SMS:', { from, body }); // Debug log
    
    // Parse the message body
    // Expected format: "INCIDENT: [type] at [location] - [description]"
    const messageRegex = /INCIDENT:\s*(.+?)\s+at\s+(.+?)\s*-\s*(.+)/i;
    const match = body.match(messageRegex);

    if (!match) {
      console.log('Message format did not match expected pattern'); // Debug log
      const twiml = new MessagingResponse();
      twiml.message('Invalid format. Please use: INCIDENT: [type] at [location] - [description]');
      return res.type('text/xml').send(twiml.toString());
    }
    console.log('Parsed message parts:', match); // Debug log

    const [, incidentType, location, description] = match;

    // Provide required fields with defaults for SMS
    const incident = new Incident({
      type: incidentType.trim(),
      description: description.trim(),
      location: location.trim(),
      // Default severity to 3 (Medium)
      severity: 3,
      // Default coordinates to 0,0 (could be improved with geocoding)
      latitude: 0,
      longitude: 0,
      // status: 1 (Verified)
      status: 1,
      // reportedBy: use a system user or fallback to a hardcoded ObjectId (replace with a real user if possible)
      reportedBy: '000000000000000000000000',
      // Optionally add reporterContact as a custom field if needed
    });
    await incident.save();

    // Send confirmation via SMS
    const twiml = new MessagingResponse();
    twiml.message('Thank you! Your emergency report has been received and will be reviewed by our team. Help will be dispatched as needed.');
    res.type('text/xml').send(twiml.toString());

    // Optionally: Notify admins about the new incident via SMS
    // This assumes you have admin phone numbers stored in environment variables
    const adminPhones = process.env.ADMIN_PHONE_NUMBERS ? process.env.ADMIN_PHONE_NUMBERS.split(',') : [];
    
    if (twilioClient && twilioClient.configured && twilioClient.client) {
      for (const adminPhone of adminPhones) {
        try {
          await twilioClient.client.messages.create({
            body: `New incident reported via SMS:\nType: ${incidentType}\nLocation: ${location}\nDescription: ${description}\nReporter: ${from}`,
            to: adminPhone.trim(),
            from: process.env.TWILIO_PHONE_NUMBER
          });
        } catch (error) {
          console.error('Error sending admin notification:', error);
        }
      }
    } else if (adminPhones.length > 0) {
      console.warn('Admin phone numbers configured but Twilio client not initialized; skipping SMS notifications.');
    }

  } catch (err) {
    console.error('Twilio SMS error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      mongodbConnected: mongoose.connection.readyState === 1
    });
    const twiml = new MessagingResponse();
    twiml.message('Sorry, there was an error processing your report. Please try again later.');
    res.type('text/xml').send(twiml.toString());
  }
});

module.exports = router;
