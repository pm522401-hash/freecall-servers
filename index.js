const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('FreeCall Signaling Server is running');
});

const wss = new WebSocket.Server({ server });

// userId -> WebSocket
const users = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Register user
      if (data.type === 'register') {
        const user = String(data.user || '').trim();

        if (!user) return;

        users.set(user, ws);
        ws.user = user;

        ws.send(JSON.stringify({
          type: 'registered',
          user: user
        }));

        console.log(`User registered: ${user}`);
        return;
      }

      // Target user
      const target = String(data.to || '').trim();

      if (!target) {
        console.log('Message without target');
        return;
      }

      const targetWs = users.get(target);

      // Target user is offline
      if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unavailable',
          to: target
        }));

        console.log(`User unavailable: ${target}`);
        return;
      }

      // Add sender information
      data.from = ws.user || '';

      // Send only to target user
      targetWs.send(JSON.stringify(data));

      console.log(
        `${data.type || 'message'}: ${ws.user || 'unknown'} -> ${target}`
      );

    } catch (e) {
      console.log('Invalid message:', e.message);
    }
  });

  ws.on('close', () => {
    if (ws.user && users.get(ws.user) === ws) {
      users.delete(ws.user);
      console.log(`User disconnected: ${ws.user}`);
    } else {
      console.log('Client disconnected');
    }
  });

  ws.on('error', (err) => {
    console.log('WebSocket error:', err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`FreeCall Signaling Server running on port ${PORT}`);
});
