declare module 'midi' {
  export class Input {
    getPortCount(): number;
    getPortName(index: number): string;
    openPort(index: number): void;
    closePort(): void;
    closePort(): void;
    close(): void;
    on(event: string, callback: (deltaTime: number, message: number[]) => void): void;
  }

  export class Output {
    getPortCount(): number;
    getPortName(index: number): string;
    openPort(index: number): void;
    openVirtualPort(name: string): void;
    closePort(): void;
    close(): void;
    sendMessage(message: number[]): void;
  }
}