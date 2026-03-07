declare module 'ssh2-sftp-client' {
  export type SftpConnectOptions = {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
    readyTimeout?: number;
  };

  export type SftpListEntry = {
    type: string;
    name: string;
    size: number;
    modifyTime?: number;
  };

  export default class SftpClient {
    connect(options: SftpConnectOptions): Promise<SftpClient>;
    list(path: string): Promise<SftpListEntry[]>;
    exists(path: string): Promise<boolean | string>;
    put(src: string, remotePath: string): Promise<string>;
    get(path: string, dst: string): Promise<string | Buffer>;
    delete(path: string, noErrorOK?: boolean): Promise<string>;
    mkdir(path: string, recursive?: boolean): Promise<string>;
    end(): Promise<boolean>;
  }
}
