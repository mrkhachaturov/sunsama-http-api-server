const http = require('http');
const crypto = require('crypto');

const SECRET = 'test-secret-123';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      // Verify signature
      const signature = req.headers['x-webhook-signature'];
      const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
      const valid = signature === expected ? '✅ VALID' : '❌ INVALID';
      
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse JSON:', e.message);
        res.writeHead(400);
        res.end('Invalid JSON');
        return;
      }
      
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('🔔 WEBHOOK RECEIVED', new Date().toISOString());
      console.log('═══════════════════════════════════════════════════');
      console.log('Event:', payload.event);
      console.log('Signature:', valid);
      console.log('API Key:', payload.apiKey);
      console.log('Task ID:', payload.data.task?._id || 'N/A (deleted)');
      console.log('Task Text:', payload.data.task?.text || 'N/A');
      if (payload.data.changes) {
        console.log('Changes:', JSON.stringify(payload.data.changes, null, 2));
      }
      console.log('═══════════════════════════════════════════════════');
      console.log('');
      
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({received: true}));
    });
  } else {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Webhook receiver ready. POST to /webhook');
  }
});

server.listen(9090, () => {
  console.log('🎯 Webhook receiver listening on port 9090');
  console.log('   Waiting for webhooks...');
  console.log('');
});

