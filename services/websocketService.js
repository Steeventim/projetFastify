const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.connections = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      const userId = req.headers['x-user-id'];
      if (userId) {
        this.connections.set(userId, ws);

        ws.on('close', () => {
          this.connections.delete(userId);
        });
      }
    });
  }

  notifyUser(userId, data) {
    const connection = this.connections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(data));
    }
  }
}

module.exports = new WebSocketService();
