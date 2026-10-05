import https from "https";
import http from "http";

async function inspectUpsy() {
  const url = new URL("https://upsy.ai/connect");
  
  const req = https.request(url, {
    method: "GET",
    headers: {
      "Accept": "text/event-stream, application/json, text/html",
      "User-Agent": "ShadeAgent/1.0"
    }
  }, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      console.log(`Body:`, data.substring(0, 1000));
    });
  });

  req.on("error", (err) => {
    console.error("Error:", err.message);
  });

  req.end();
}

inspectUpsy();
