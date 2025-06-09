const https = require("https");
const fs = require("fs");
const path = require("path");

// --- Configuration ---
const API_KEY = "AIzaSyAjdgsEW2HjHY71DyDffndBR73lBMHrMRE"; // Replace with your key
const PROXY_URL = "https://lezhi.deno.dev/api/v1/chat/completions";
// const AUDIO_FILE_PATH = "./test_audio.mp3"; // Make sure test_audio.mp3 is in the same directory
const MODEL_ALIAS = "gemini-2.0-flash"; // Or try 'gemini-2.0-flash' if alias fails
const SEND_TEXT_ONLY = true; // Flag to control payload
// --- End Configuration ---

/* // Comment out audio file check for text-only test
if (!fs.existsSync(AUDIO_FILE_PATH)) {
  console.error(`Error: Audio file not found at ${AUDIO_FILE_PATH}`);
  console.log("Please download it first:");
  console.log(
    "wget https://lezhienglish.top/recording/1/mock-test-1742992551783-75252672.mp3 -O test_audio.mp3",
  );
  process.exit(1);
}
*/

if (API_KEY === "<YOUR_GEMINI_LEZHI_API_KEY>") {
  console.error(
    `Error: Please replace <YOUR_GEMINI_LEZHI_API_KEY> with your actual API key in the script.`,
  );
  process.exit(1);
}

try {
  let audioBase64 = null;
  if (!SEND_TEXT_ONLY) {
    // Read and encode audio file only if needed
    const AUDIO_FILE_PATH = "./test_audio.mp3"; // Define locally if needed
     if (!fs.existsSync(AUDIO_FILE_PATH)) {
      console.error(`Error: Audio file not found at ${AUDIO_FILE_PATH}`);
      // ... (rest of file check) ...
      process.exit(1);
    }
    const audioBuffer = fs.readFileSync(AUDIO_FILE_PATH);
    audioBase64 = audioBuffer.toString("base64");
    console.log(
      `Read and base64 encoded audio file (${audioBase64.length} chars).`,
    );
  } else {
      console.log("Configured for text-only request.");
  }

  // Construct the payload using OpenAI chat completions structure
  const userContent = [
    {
      type: "text",
      text: SEND_TEXT_ONLY ? "Hello, who are you?" : "Please transcribe this audio file precisely."
    }
  ];

  if (!SEND_TEXT_ONLY && audioBase64) {
    userContent.push({
      type: "audio_url", // Keep for potential future proxy updates, but won't be sent if SEND_TEXT_ONLY is true
      audio_url: {
        url: `data:audio/mp3;base64,${audioBase64}`
      }
    });
  }

  const payload = {
    model: MODEL_ALIAS, // Proxy should map this if needed
    messages: [
      {
        role: "user",
        // Send string content for text-only, array for multimodal attempt
        content: SEND_TEXT_ONLY ? userContent[0].text : userContent
      }
    ],
    max_tokens: 500 // OpenAI format expects max_tokens here
  };


  const payloadString = JSON.stringify(payload);
  const url = new URL(PROXY_URL);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payloadString),
    },
  };

  console.log(`Sending request to: ${PROXY_URL}`);
  // Log the modified payload structure (OpenAI format)
  console.log(
    "Payload structure (audio data truncated if present):",
    JSON.stringify(
      {
        ...payload,
        messages: [
          {
            ...payload.messages[0],
            // Adjust logging based on content type (string or array)
            content: SEND_TEXT_ONLY
              ? payload.messages[0].content // Just the string
              : payload.messages[0].content.map(part => {
                  if (part.type === 'audio_url' && part.audio_url) {
                    return { ...part, audio_url: { url: part.audio_url.url.substring(0, 50) + '...' } };
                  }
                  return part;
                })
          }
        ]
      },
      null,
      2,
    ),
  );

  const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("Response Body:");
      try {
        // Try parsing as JSON, otherwise print raw data
        console.log(JSON.stringify(JSON.parse(data), null, 2));
      } catch (e) {
        console.log(data);
      }
    });
  });

  req.on("error", (error) => {
    console.error("Request Error:", error);
  });

  // Write payload and end request
  req.write(payloadString);
  req.end();
} catch (error) {
  console.error("Script execution error:", error);
}
