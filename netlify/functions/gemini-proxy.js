// Use node-fetch for making server-side requests
// You might need to install it: npm install node-fetch@2 (version 2 is common for CJS)
const fetch = require('node-fetch'); 

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Get the API key from environment variables (set this in Netlify)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error("Gemini API key not found in environment variables.");
        return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured on the server.' }) };
    }

    let payload;
    try {
        payload = JSON.parse(event.body);
    } catch (error) {
        console.error("Error parsing request body:", error);
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
    }

    // Determine the target Google API endpoint based on payload
    const model = 'gemini-2.5-flash-preview-09-2025'; // Consistent model
    const baseApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const targetUrl = `${baseApiUrl}?key=${GEMINI_API_KEY}`;

    // Remove the 'action' property added by the frontend, it's just for routing here if needed
    // delete payload.action; 
    // It's safer not to modify the payload unless absolutely necessary.
    // Google API should ignore extra fields like 'action'.

    console.log("Proxying request to Google API:", targetUrl); // Log the target
    // console.log("Payload being sent:", JSON.stringify(payload, null, 2)); // Careful logging payload

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) // Forward the original payload
        });

        const responseBody = await response.text(); // Get text first to handle potential errors better
        
        // Log status and truncated body for debugging
        console.log(`Google API Response Status: ${response.status}`);
        // console.log(`Google API Response Body (truncated): ${responseBody.substring(0, 500)}...`);


        // Forward Google's response status and body
        // Ensure content type is set correctly
        const headers = {
            'Content-Type': response.headers.get('Content-Type') || 'application/json' 
        };
        
        // Handle potential non-JSON error responses from Google
         if (!response.ok) {
             console.error(`Google API Error (${response.status}):`, responseBody);
             // Try to return a JSON error if possible, otherwise plain text
             try {
                 JSON.parse(responseBody); // Check if it's valid JSON
                 return { statusCode: response.status, headers, body: responseBody };
             } catch (e) {
                  return { statusCode: response.status, headers: {'Content-Type': 'text/plain'}, body: `Google API Error: ${responseBody.substring(0, 200)}...` };
             }
         }

        // Return successful JSON response from Google
        return {
            statusCode: 200,
            headers,
            body: responseBody 
        };

    } catch (error) {
        console.error('Error calling Google API via proxy:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Server error calling Google API: ${error.message}` })
        };
    }
};

