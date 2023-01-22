import { Socket } from 'node:net';

declare enum Status {
    "HANDSHAKE" = "HANDSHAKE",
    "CONNECT" = "CONNECT",
    "CLOSE" = "CLOSE"
}
declare class Cluster$1 {
    private socket;
    subdomain: string;
    status: Status;
    constructor(socket: Socket, master: Master<any, any>);
}

type SignalCluster = {
    "CLOSE": [{}, {}];
    "END": [{}, {}];
    "ERROR": [{}, {}];
};
type TOptConnect = {
    port: number;
    host: string;
    subdomain: string;
};
type TCallbackCluster<C extends SignalMaster, T extends Record<string, Array<Record<string, any>>> = C> = <K extends keyof T, V extends T[K]>(type: K, value: V[0], reply?: <VALUE extends V[1]>(value: VALUE) => void) => void;
type TEventsCluster<T extends SignalMaster> = (callback: TCallbackCluster<T>) => void;
declare class Cluster<M extends SignalMaster, C extends SignalCluster, CT extends Record<string, Array<Record<string, any>>> = C> {
    status: Status;
    lastRequest: number;
    private client;
    private count;
    private callback;
    private port;
    private host;
    private subdomain;
    private callbackEvents;
    private bodyMaster;
    constructor(callback: (cluster: Cluster<M, C, CT>, events: TEventsCluster<M>) => void);
    connect: (opt: TOptConnect) => void;
    reconnect: () => void;
    events: TEventsCluster<M>;
    init: (port: number, host: string, subdomain: string) => void;
    close: () => Socket;
    send<K extends keyof CT, V extends CT[K]>(type: K, value: V[0]): Promise<V[1]>;
    send<K extends keyof CT, V extends CT[K]>(type: K, value: V[0], callback: (data: V[1]) => void): void;
}

declare module "node:net" {
    interface Socket {
        id: string;
    }
}

type SignalMaster = {
    "CONNECT": [{}, {}];
    "END": [{}, {}];
    "ERROR": [{}, {}];
    "CLOSE": [{}, {}];
    "HANDSHAKE": [{}, {}];
};
type TCallbackMaster<C extends SignalCluster, T extends Record<string, Array<Record<string, any>>> = C> = <K extends keyof T, V extends T[K]>(socket: Socket, type: K, value: V[0], reply?: (value: V[1]) => void) => void;
type TEventsMaster<T extends SignalCluster> = (callback: TCallbackMaster<T>) => void;
declare class Master<M extends SignalMaster, C extends SignalCluster, MT extends Record<string, Array<Record<string, any>>> = M> {
    clusters: Map<string, Cluster$1>;
    port: number;
    host: string;
    callback: Record<number, (value?: any | PromiseLike<any>) => void>;
    count: number;
    callbackEvents: TCallbackMaster<C>;
    private bodyMaster;
    private listening;
    private error;
    private server;
    private events;
    constructor(callback: (master: Master<M, C>, events: TEventsMaster<C>) => void);
    listen: (port?: number, host?: string) => void;
    send<K extends keyof MT, V extends MT[K]>(socket: Socket, type: K, value: V[0]): Promise<V[1]>;
    send<K extends keyof MT, V extends MT[K]>(socket: Socket, type: K, value: V[0], callback: (data: V[1]) => void): void;
}

export { Cluster, Master, SignalCluster, SignalMaster };
