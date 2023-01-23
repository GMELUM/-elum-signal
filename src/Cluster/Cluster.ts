import { createConnection, Socket } from "node:net";

import { SignalMaster } from "../Master/Master";
import { Status } from "../Master/classes/Cluster";

export type SignalCluster = {
  "CLOSE": [{}, {}],
  "END": [{}, {}],
  "ERROR": [{}, {}],
};

type TOptConnect = {
  port: number,
  host: string,
  subdomain: string
}

type TCallbackCluster<
  C extends SignalMaster,
  T extends Record<string, Array<Record<string, any>>> = C> =
  <K extends keyof T, V extends T[K]>(type: K, value: V[0], reply?: <VALUE extends V[1]>(value: VALUE) => void) => void;

type TEventsCluster<T extends SignalMaster> = (callback: TCallbackCluster<T>) => void;

class Cluster<
  M extends SignalMaster,
  C extends SignalCluster,
  CT extends Record<string, Array<Record<string, any>>> = C
> {

  public status: Status = Status.CLOSE;
  public lastRequest: number = Date.now();

  private client: Socket;
  private count: number = 0;
  private callback: Record<number, (value?: any | PromiseLike<any>) => void> = {};

  private port: number;
  private host: string;
  private subdomain: string;

  private callbackEvents: TCallbackCluster<M>;
  private bodyMaster: (cluster: Cluster<M, C, CT>, events: TEventsCluster<M>) => void;

  constructor(callback: (
    cluster: Cluster<M, C, CT>,
    events: TEventsCluster<M>
  ) => void) {
    this.bodyMaster = callback;
  }

  public connect = (opt: TOptConnect) => {
    const { port, host, subdomain } = opt;

    this.port = port;
    this.host = host;
    this.subdomain = subdomain;

    this.bodyMaster(this, (callback) => {
      this.events(callback);
      this.init(port, host, subdomain);
    });

  }

  public reconnect = () => this.init(this.port, this.host, this.subdomain);

  public events: TEventsCluster<M> = (callback) => this.callbackEvents = callback;

  public init = (port: number, host: string, subdomain: string) => {
    const client = createConnection({ port: port, host: host });
    client.on("error", () => this.callbackEvents("ERROR", {}));
    client.on("end", () => this.callbackEvents("END", {}));
    client.on("close", () => this.callbackEvents("CLOSE", {}));
    client.on("connect", () => { this.status = Status.HANDSHAKE });
    client.on("data", (data) => {
      try {
        this.lastRequest = Date.now();

        const { type, value, requestId } = JSON.parse(data.toString());

        const reply = (requestId: number) => (value: any) => {
          const message = JSON.stringify({ value, requestId });
          client.write(message);
        }

        if (this.status === Status.HANDSHAKE) {
          if (type === "CONNECT") {
            this.status = Status.CONNECT;
            this.send("CONNECT", { subdomain: this.subdomain })
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
      } catch (err) { console.error(err) }
    });

    this.client = client;

  };

  public close = () => this.client.end();

  public send<K extends keyof CT, V extends CT[K]>(type: K, value: V[0]): Promise<V[1]>
  public send<K extends keyof CT, V extends CT[K]>(type: K, value: V[0], callback: (data: V[1]) => void): void
  public send<K extends keyof CT, V extends CT[K]>(type: K, value: V[0], callback?: (data: V[1]) => void): void | Promise<V[1]> {
    if (this.client.write) {
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
    } else { console.log("[ERROR] "); }

  }

}

export default Cluster;
