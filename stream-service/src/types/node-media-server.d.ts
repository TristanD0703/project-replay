declare module "node-media-server" {
  export interface NodeMediaServerConfig {
    bind?: string;
    rtmp?: {
      port?: number;
    };
    http?: {
      port?: number;
    };
    auth?: {
      play?: boolean;
      publish?: boolean;
      secret?: string;
    };
    record?: {
      path: string;
    };
    [key: string]: unknown;
  }

  export interface NodeMediaServerSession {
    id: string;
    streamPath: string;
    streamName?: string;
    streamApp?: string;
    streamHost?: string;
    streamQuery?: Record<string, string | string[] | undefined>;
    protocol?: string;
    ip?: string;
    [key: string]: unknown;
    close?: () => void;
    stop?: () => void;
    reject: () => void;
  }

  export default class NodeMediaServer {
    constructor(config: NodeMediaServerConfig);
    on(
      eventName: string,
      listener: (session: NodeMediaServerSession) => void,
    ): void;
    run(): void;
  }
}
