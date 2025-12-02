exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Method Not Allowed</Message></Response>'
    };
  }

  try {
    const params = new URLSearchParams(event.body);
    const message = params.get('Body') || '';
    const fromNumber = params.get('From') || '';
    const messageLower = message.toLowerCase();

    console.log('Message received:', { message, fromNumber });

    // ✅ 1. GREETING / FIRST MESSAGE
    if (messageLower.includes('hi') || messageLower.includes('hello') || messageLower.includes('help')) {
      return sendInteractiveMenu(fromNumber);
    }
    
    // ✅ 2. LOCATION REQUEST (button 1)
    if (messageLower.includes('location') || messageLower.includes('where') || message === '1') {
      return await sendDriverLocationWithETA(fromNumber);
    }
    
    // ✅ 3. ETA REQUEST (button 2)
    if (messageLower.includes('eta') || messageLower.includes('time') || messageLower.includes('arrive') || message === '2') {
      return await sendETA(fromNumber);
    }
    
    // ✅ 4. DRIVER INFO (button 3)
    if (messageLower.includes('driver') || messageLower.includes('contact') || message === '3') {
      return await sendDriverInfo(fromNumber);
    }
    
    // ✅ 5. SEND LIVE LOCATION (button 4)
    if (message === '4') {
      return await sendLiveLocation(fromNumber);
    }
    
    // ✅ 6. DEFAULT - SEND INTERACTIVE MENU
    return sendInteractiveMenu(fromNumber);
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>⚠️ System error. Please text "HELP" for options.</Message>
</Response>`
    };
  }
};

// ✅ INTERACTIVE MENU WITH BUTTONS
function sendInteractiveMenu(fromNumber) {
  const menuText = `🚚 *WOSH DELIVERY TRACKING*\n
Hello! I can help you track your delivery. Please choose an option:\n
1️⃣ *Driver Location* - See where your driver is
2️⃣ *Estimated Arrival* - Get ETA to your address
3️⃣ *Driver Contact* - Get driver details
4️⃣ *Live Tracking Link* - Open live map\n
*Reply with number (1, 2, 3, or 4)*`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${menuText}</Message>
</Response>`
  };
}

// ✅ 1. DRIVER LOCATION WITH ETA
async function sendDriverLocationWithETA(fromNumber) {
  try {
    // Get driver location (simulated or real)
    const driverLocation = await getDriverLocation(fromNumber);
    
    if (!driverLocation || !driverLocation.lat) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>📍 Driver location not available. Please try again in 5 minutes.</Message>
</Response>`
      };
    }
    
    // Calculate ETA based on distance (AI/Google Maps simulation)
    const eta = await calculateETA(driverLocation.lat, driverLocation.lng, fromNumber);
    
    const mapsLink = `https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`;
    const liveLink = `https://maps.app.goo.gl/?q=${driverLocation.lat},${driverLocation.lng}`;
    
    const responseText = `📍 *DRIVER LOCATION*\n
🚗 *Driver:* ${driverLocation.driverName}
📍 *Live Map:* ${liveLink}
📱 *Status:* ${driverLocation.status}
📞 *Contact:* ${driverLocation.phone}
⏱️ *ETA to You:* ${eta.time} (${eta.distance} away)
📊 *Speed:* ${driverLocation.speed || '45 km/h'}\n
_Reply "2" for updated ETA or "4" for live tracking_`;
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${responseText}</Message>
</Response>`
    };
    
  } catch (error) {
    console.error('Location error:', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>🚨 Unable to fetch location. Please try again.</Message>
</Response>`
    };
  }
}

// ✅ 2. ETA CALCULATION (AI-Powered)
async function sendETA(fromNumber) {
  try {
    const driverLocation = await getDriverLocation(fromNumber);
    
    if (!driverLocation || !driverLocation.lat) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>⏱️ ETA not available. Driver may be offline.</Message>
</Response>`
      };
    }
    
    const eta = await calculateETA(driverLocation.lat, driverLocation.lng, fromNumber);
    
    const responseText = `⏱️ *ESTIMATED ARRIVAL TIME*\n
📅 *Today's Delivery*\n
🕐 *Estimated Arrival:* ${eta.time}
📏 *Distance:* ${eta.distance}
🚦 *Traffic Condition:* ${eta.traffic}
📊 *Confidence:* ${eta.confidence}\n
_Updates every 5 minutes. Reply "1" for live location._`;
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${responseText}</Message>
</Response>`
    };
    
  } catch (error) {
    console.error('ETA error:', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>⏱️ Unable to calculate ETA. Please try location instead.</Message>
</Response>`
    };
  }
}

// ✅ 3. DRIVER INFORMATION
async function sendDriverInfo(fromNumber) {
  const driverLocation = await getDriverLocation(fromNumber);
  
  const responseText = `👤 *DRIVER INFORMATION*\n
*Name:* ${driverLocation?.driverName || 'Ahmad (Driver #007)'}
*Phone:* ${driverLocation?.phone || '+6012-345 6789'}
*Vehicle:* Motorcycle (WOSH Delivery)
*Rating:* ⭐⭐⭐⭐⭐ (4.8/5)
*Deliveries Today:* 12/15 completed\n
📍 _Currently: ${driverLocation?.status || 'En route to your location'}_\n
📞 *Need help?* Call dispatch: 03-1234 5678`;
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${responseText}</Message>
</Response>`
  };
}

// ✅ 4. LIVE TRACKING LINK
async function sendLiveLocation(fromNumber) {
  const driverLocation = await getDriverLocation(fromNumber);
  
  if (!driverLocation || !driverLocation.lat) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>🚨 Live tracking not available. Driver may be offline.</Message>
</Response>`
    };
  }
  
  const liveLink = `https://maps.app.goo.gl/?q=${driverLocation.lat},${driverLocation.lng}`;
  const mapsLink = `https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}`;
  
  const responseText = `📍 *LIVE TRACKING LINK*\n
Click to open live tracking:\n
${liveLink}\n
_or open:_\n
${mapsLink}\n
📍 *Driver is here:* ${driverLocation.lat}, ${driverLocation.lng}
⏱️ *Last updated:* Just now\n
_Note: Location updates every 2 minutes._`;
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${responseText}</Message>
</Response>`
  };
}

// ✅ AI-POWERED ETA CALCULATION
async function calculateETA(driverLat, driverLng, customerPhone) {
  try {
    // Simulate AI calculation based on:
    // 1. Distance
    // 2. Traffic patterns
    // 3. Time of day
    // 4. Historical data
    
    // For now, simulate based on KL area distances
    const baseDistance = 3.5 + (Math.random() * 8); // 3.5-11.5 km
    const trafficFactor = getTrafficFactor(); // AI simulation
    const speed = 40 + (Math.random() * 30); // 40-70 km/h
    
    const travelTimeMinutes = Math.round((baseDistance / speed) * 60 * trafficFactor);
    
    // Add buffer time
    const bufferMinutes = 5 + Math.floor(Math.random() * 10);
    const totalMinutes = travelTimeMinutes + bufferMinutes;
    
    // Generate arrival time
    const now = new Date();
    now.setMinutes(now.getMinutes() + totalMinutes);
    
    const formattedTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    return {
      time: `${formattedTime} (in ${totalMinutes} minutes)`,
      distance: `${baseDistance.toFixed(1)} km`,
      traffic: getTrafficCondition(trafficFactor),
      confidence: `${85 + Math.floor(Math.random() * 15)}% accurate`
    };
    
  } catch (error) {
    console.error('ETA calculation error:', error);
    // Return default
    return {
      time: "15-25 minutes",
      distance: "4.2 km",
      traffic: "Moderate",
      confidence: "85% accurate"
    };
  }
}

function getTrafficFactor() {
  const hour = new Date().getHours();
  
  // AI-simulated traffic patterns for KL
  if (hour >= 7 && hour <= 9) return 1.8; // Morning rush
  if (hour >= 17 && hour <= 19) return 2.0; // Evening rush
  if (hour >= 12 && hour <= 14) return 1.3; // Lunch time
  if (hour >= 20 || hour <= 6) return 1.0; // Night - clear
  return 1.5; // Normal daytime
}

function getTrafficCondition(factor) {
  if (factor >= 2.0) return "🚦 Heavy Traffic";
  if (factor >= 1.5) return "🚦 Moderate Traffic";
  if (factor >= 1.2) return "🚦 Light Traffic";
  return "✅ Clear Roads";
}

// ✅ DRIVER LOCATION FUNCTION (Connect to ProTrack)
async function getDriverLocation(customerPhone) {
  try {
    // SIMULATED LOCATION FOR TESTING
    // Replace this with your actual ProTrack API integration
    
    // Random KL coordinates
    const klLat = 3.1390 + ((Math.random() - 0.5) * 0.03);
    const klLng = 101.6869 + ((Math.random() - 0.5) * 0.03);
    
    // Driver status based on time
    const hour = new Date().getHours();
    let status = "En route to delivery";
    if (hour >= 18) status = "Final delivery of the day";
    if (hour >= 20) status = "Completed deliveries";
    
    return {
      lat: klLat,
      lng: klLng,
      driverName: "Ahmad (Driver #007)",
      status: status,
      phone: "+6012-345 6789",
      speed: `${40 + Math.floor(Math.random() * 30)} km/h`,
      lastUpdate: "Just now"
    };
    
    /* 
    // UNCOMMENT THIS FOR REAL PROTACK INTEGRATION
    
    const username = process.env.PROTRACK_USERNAME || "woshmalaysia";
    const password = process.env.PROTRACK_PASSWORD || "1234567";
    const apiUrl = process.env.PROTRACK_API_URL;
    
    // Your ProTrack API implementation here
    // ... 
    */
    
  } catch (error) {
    console.error('Get location error:', error);
    return null;
  }
}