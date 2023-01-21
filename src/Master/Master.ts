import { createServer, Socket } from "node:net";

declare module "node:net" {
  interface Socket {
    id: string;
  }
}

import { SignalCluster } from "../Cluster/Cluster";
import Cluster from "./classes/Cluster";

export type SignalMaster = {
  "END": [{}, {}];
  "ERROR": [{}, {}];
  "CLOSE": [{}, {}];
  "HANDSHAKE": [{}, {}];
};

type TCallbackMaster<
  C extends SignalCluster,
  T extends Record<string, Array<Record<string, any>>> = C
> = <K extends keyof T, V extends T[K]>(socket: Socket, type: K, value: V[0], reply?: (value: V[1]) => void) => void;

type TEventsMaster<T extends SignalCluster> = (callback: TCallbackMaster<T>) => void;

class Master<
  M extends SignalMaster,
  C extends SignalCluster,
  MT extends Record<string, Array<Record<string, any>>> = M
> {

  public clusters: Map<string, Cluster> = new Map();

  public port = 18400;
  public host = "0.0.0.0";

  public callback: Record<number, (value?: any | PromiseLike<any>) => void> = {};
  public count: number = 0;

  public callbackEvents: TCallbackMaster<C>;

  private bodyMaster: (master: Master<M, C>, events: TEventsMaster<C>) => void;

  private listening = () => console.info(`[INFO] Listening ${this.host}:${this.port}`);

  private error = (error: Error) => {
    if (error.name === 'EADDRINUSE') {
      console.error("[ERROR] Port is use");
    }
  }

  private server = createServer((socket) => { new Cluster(socket, this) }
    // {
    //   const clusterUUID = uuid("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    //   this.clusters.set(clusterUUID, new Cluster(socket, this));

    //   socket.on("error", (error) => this.callbackEvents(socket, "ERROR", error));
    //   socket.on("connect", () => this.callbackEvents(socket, "CONNECT", {}));
    //   socket.on("close", () => this.callbackEvents(socket, "DISCONNECT", {}));

    //   socket.on("data", (data) => {
    //     const { type, value, requestId } = JSON.parse(data.toString());
    //     const reply = (requestId: number) => (value: any) => {
    //       const message = JSON.stringify({ value, requestId });
    //       socket.write(message);
    //     }
    //     if (!type && requestId && this.callback[requestId]) {
    //       this.callback[requestId](value);
    //       delete this.callback[requestId]; return;
    //     } else { this.callbackEvents(socket, type, value, reply(requestId)) }
    //   })

    // }
  )
    .on("error", this.error)
    .on("listening", this.listening);

  private events: TEventsMaster<C> = (callback) =>
    this.callbackEvents = callback;

  constructor(callback: (
    master: Master<M, C>,
    events: TEventsMaster<C>
  ) => void) { this.bodyMaster = callback };

  public listen = (port: number = this.port, host: string = this.host) => {
    this.port = port;
    this.host = host;
    this.bodyMaster(this, this.events)
    this.server.listen(port, host);
  }

  public send<K extends keyof MT, V extends MT[K]>(socket: Socket, type: K, value: V[0]): Promise<V[1]>
  public send<K extends keyof MT, V extends MT[K]>(socket: Socket, type: K, value: V[0], callback: (data: V[1]) => void): void
  public send<K extends keyof MT, V extends MT[K]>(socket: Socket, type: K, value: V[0], callback?: (data: V[1]) => void): void | Promise<V[1]> {
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

export default Master;
