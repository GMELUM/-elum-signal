import { createServer, createConnection } from 'node:net';

var Status = /* @__PURE__ */ ((Status2) => {
  Status2["HANDSHAKE"] = "HANDSHAKE";
  Status2["CONNECT"] = "CONNECT";
  Status2["CLOSE"] = "CLOSE";
  return Status2;
})(Status || {});
let Cluster$1 = class Cluster {
  socket;
  subdomain;
  status = "CLOSE" /* CLOSE */;
  constructor(socket, master) {
    let timer;
    const closeEvent = () => {
      socket.destroy();
      master.clusters.delete(this.subdomain);
      this.status = "CLOSE" /* CLOSE */;
    };
    socket.on("error", closeEvent);
    socket.on("close", closeEvent);
    socket.on("data", (data) => {
      const { type, value, requestId } = JSON.parse(data.toString());
      if (this.status === "HANDSHAKE" /* HANDSHAKE */ && !type && requestId && master.callback[requestId]) {
        master.callback[requestId](value);
        delete master.callback[requestId];
        return;
      }
      if (this.status === "CLOSE" /* CLOSE */) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          closeEvent();
        }, 5e3);
        this.status = "HANDSHAKE" /* HANDSHAKE */;
        master.send(socket, "HANDSHAKE", {}, (data2) => {
          if (data2.subdomain) {
            clearTimeout(timer);
            this.subdomain = data2.subdomain;
            this.status = "CONNECT" /* CONNECT */;
            master.clusters.set(data2.subdomain, this);
            master.send(socket, "CONNECT", {});
          }
        });
      }
      if (this.status === "CONNECT" /* CONNECT */) {
        if (!type && requestId && master.callback[requestId]) {
          master.callback[requestId](value);
          delete master.callback[requestId];
          return;
        } else {
          const reply = (requestId2) => (value2) => {
            const message = JSON.stringify({ value: value2, requestId: requestId2 });
            socket.write(message);
          };
          master.callbackEvents(socket, type, value, reply(requestId));
        }
        return;
      }
    });
    this.socket = socket;
    this.status = "HANDSHAKE" /* HANDSHAKE */;
    master.send(socket, "HANDSHAKE", {}, (data) => {
      if (data.subdomain) {
        clearTimeout(timer);
        this.subdomain = data.subdomain;
        this.status = "CONNECT" /* CONNECT */;
        master.clusters.set(data.subdomain, this);
        master.send(socket, "CONNECT", {});
      }
    });
  }
};

class Master {
  clusters = /* @__PURE__ */ new Map();
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
  server = createServer(
    (socket) => {
      new Cluster$1(socket, this);
    }
  ).on("error", this.error).on("listening", this.listening);
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
  status = Status.CLOSE;
  lastRequest = Date.now();
  client;
  count = 0;
  callback = {};
  port;
  host;
  subdomain;
  callbackEvents;
  bodyMaster;
  constructor(callback) {
    this.bodyMaster = callback;
  }
  connect = (opt) => {
    const { port, host, subdomain } = opt;
    this.port = port;
    this.host = host;
    this.subdomain = subdomain;
    this.bodyMaster(this, (callback) => {
      this.events(callback);
      this.init(port, host, subdomain);
    });
  };
  reconnect = () => this.init(this.port, this.host, this.subdomain);
  events = (callback) => this.callbackEvents = callback;
  init = (port, host, subdomain) => {
    const client = createConnection({ port, host });
    client.on("error", () => this.callbackEvents("ERROR", {}));
    client.on("end", () => this.callbackEvents("END", {}));
    client.on("close", () => this.callbackEvents("CLOSE", {}));
    client.on("connect", () => {
      this.status = Status.HANDSHAKE;
    });
    client.on("data", (data) => {
      this.lastRequest = Date.now();
      const { type, value, requestId } = JSON.parse(data.toString());
      const reply = (requestId2) => (value2) => {
        const message = JSON.stringify({ value: value2, requestId: requestId2 });
        client.write(message);
      };
      if (this.status === Status.HANDSHAKE) {
        if (type === "CONNECT") {
          this.status = Status.CONNECT;
          return;
        }
        if (type === "HANDSHAKE") {
          reply(requestId)({ subdomain });
          return;
        }
        return;
      }
      if (this.status === Status.CONNECT && !type && requestId && this.callback[requestId]) {
        this.callback[requestId](value);
        delete this.callback[requestId];
        return;
      }
      this.callbackEvents(type, value, reply(requestId));
    });
    this.client = client;
  };
  close = () => this.client.end();
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

export { Cluster, Master };
