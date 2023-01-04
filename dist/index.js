'use strict';

var node_net = require('node:net');

const uuid = (masc = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") => {
  let d = new Date().getTime();
  let uuid2 = masc.replace(/[xy]/g, (c) => {
    let r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == "x" ? r : r & 3 | 8).toString(16);
  });
  return uuid2;
};

class Master {
  port = 18400;
  host = "0.0.0.0";
  callback = {};
  count = 0;
  callbackEvents;
  bodyMaster;
  listening = () => console.info(`[INFO] Listening ${this.host}:${this.port}`);
  error = (error) => {
    if (error.name === "EADDRINUSE") {
      console.error("[ERROR] Port is use");
    }
  };
  server = node_net.createServer((socket) => {
    socket.id = uuid("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    socket.on("error", this.error);
    socket.on("data", (data) => {
      const { type, value, requestId } = JSON.parse(data.toString());
      const reply = (requestId2) => (value2) => {
        const message = JSON.stringify({ value: value2, requestId: requestId2 });
        socket.write(message);
      };
      if (!type && requestId && this.callback[requestId]) {
        this.callback[requestId](value);
        delete this.callback[requestId];
        return;
      } else {
        this.callbackEvents(socket, type, value, reply(requestId));
      }
    });
  }).on("error", this.error).on("listening", this.listening);
  events = (callback) => this.callbackEvents = callback;
  constructor(callback) {
    this.bodyMaster = callback;
  }
  listen = (port = this.port, host = this.host) => {
    this.port = port;
    this.host = host;
    this.bodyMaster(this, this.events);
    this.server.listen(port, host);
  };
  send(socket, type, value, callback) {
    if (!callback) {
      return new Promise((resolve) => {
        const requestId = ++this.count;
        this.callback[requestId] = resolve;
        const message = JSON.stringify({ type, value, requestId });
        socket.write(message);
      });
    } else {
      const requestId = ++this.count;
      this.callback[requestId] = callback;
      const message = JSON.stringify({ type, value, requestId });
      socket.write(message);
    }
  }
}

class Cluster {
  client;
  count = 0;
  callback = {};
  callbackEvents;
  bodyMaster;
  constructor(callback) {
    this.bodyMaster = callback;
  }
  connect = (opt) => {
    const { port, host, subdomain } = opt;
    this.init(port, host);
    this.bodyMaster(this, this.events);
  };
  events = (callback) => this.callbackEvents = callback;
  init = (port, host) => {
    const client = node_net.createConnection({ port, host });
    client.on("end", () => {
    });
    client.on("connect", () => {
      console.log("connected");
    });
    client.on("data", (data) => {
      const { type, value, requestId } = JSON.parse(data.toString());
      const reply = (requestId2) => (value2) => {
        const message = JSON.stringify({ value: value2, requestId: requestId2 });
        client.write(message);
      };
      if (!type && requestId && this.callback[requestId]) {
        this.callback[requestId](value);
        delete this.callback[requestId];
        return;
      } else {
        this.callbackEvents(type, value, reply(requestId));
      }
    });
    this.client = client;
  };
  send(type, value, callback) {
    if (!callback) {
      return new Promise((resolve) => {
        const requestId = ++this.count;
        this.callback[requestId] = resolve;
        const message = JSON.stringify({ type, value, requestId });
        this.client.write(message);
      });
    } else {
      const requestId = ++this.count;
      this.callback[requestId] = callback;
      const message = JSON.stringify({ type, value, requestId });
      this.client.write(message);
    }
  }
}

exports.Cluster = Cluster;
exports.Master = Master;
