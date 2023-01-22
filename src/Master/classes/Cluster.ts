import { Socket } from "node:net";

import Master from "../Master";

export enum Status {
  "HANDSHAKE" = "HANDSHAKE",
  "CONNECT" = "CONNECT",
  "CLOSE" = "CLOSE"
}

class Cluster {

  private socket: Socket;
  public subdomain: string;
  public status: Status = Status.CLOSE;

  constructor(socket: Socket, master: Master<any, any>) {

    let timer: NodeJS.Timeout;

    const closeEvent = () => {
      socket.destroy();
      master.clusters.delete(this.subdomain);
      this.status = Status.CLOSE;
    };

    socket.on("error", closeEvent);
    socket.on("close", closeEvent);

    socket.on("data", (data) => {
      const { type, value, requestId } = JSON.parse(data.toString());

      if (this.status === Status.HANDSHAKE && !type && requestId && master.callback[requestId]) {
        master.callback[requestId](value);
        delete master.callback[requestId];
        return;
      }

      if (this.status === Status.CLOSE) {
        clearTimeout(timer);
        timer = setTimeout(() => { closeEvent(); }, 5000);
        this.status = Status.HANDSHAKE;
        master.send(socket, "HANDSHAKE", {}, (data) => {
          if (data.subdomain) {
            clearTimeout(timer);
            this.subdomain = data.subdomain;
            this.status = Status.CONNECT;
            master.callbackEvents(socket, type, data.subdomain);
            master.clusters.set(data.subdomain, this);
            master.send(socket, "CONNECT", {})
          }
        });
      };

      if (this.status === Status.CONNECT) {
        if (!type && requestId && master.callback[requestId]) {
          master.callback[requestId](value);
          delete master.callback[requestId]; return;
        } else {
          const reply = (requestId: number) => (value: any) => {
            const message = JSON.stringify({ value, requestId });
            socket.write(message);
          }
          master.callbackEvents(socket, type, value, reply(requestId));
        }
        return;
      }

    });

    this.socket = socket;

    this.status = Status.HANDSHAKE;
    master.send(socket, "HANDSHAKE", {}, (data) => {
      if (data.subdomain) {
        clearTimeout(timer);
        this.subdomain = data.subdomain;
        this.status = Status.CONNECT;
        master.clusters.set(data.subdomain, this);
        master.send(socket, "CONNECT", {})
      }
    });

  };

}

export default Cluster;
