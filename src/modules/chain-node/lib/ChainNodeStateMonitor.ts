import io, { Socket } from "socket.io-client";

import { ChainNodeSubject } from './ChainNodeSubject';
import { NodeHeader } from '../types';
import { ChainNodeObserver } from './ChainNodeObserver';

export class ChainNodeStateMonitor implements ChainNodeSubject {
    private observers: ChainNodeObserver[];
    private delegates: string[];
    private ioClient: typeof Socket;

    constructor(private readonly id: string, private readonly nodeheader: NodeHeader) {
        this.observers = [];
        this.delegates = [];

        this.onBlockChange = this.onBlockChange.bind(this);

        this.ioClient = io(this.buildIoServer());

        this.ioClient.on('blocks/change', this.onBlockChange);

        function buildInfo(event: string): [string, () => void] {
            return [
                event,
                () => console.log(event)
            ];
        }
        this.ioClient.on(...buildInfo('connect'));
        this.ioClient.on(...buildInfo('connect_error'));
        this.ioClient.on(...buildInfo('connect_timeout'));
    }

    get Id(): string {
        return this.id;
    }

    async attackObserver(observer: ChainNodeObserver): Promise<boolean> {
        if (await this.hasObserver(observer)) {
            return false;
        }

        this.observers.push(observer);
        return true;
    }

    async detachObserver(observer: ChainNodeObserver): Promise<boolean> {
        if (!await this.hasObserver(observer)) {
            return false;
        }

        const idx = this.observers.findIndex((value: ChainNodeObserver) => value === observer);
        this.observers.splice(idx, 1);
        return true;
    }

    async hasObserver(observer: ChainNodeObserver): Promise<boolean> {
        return this.observers.findIndex((value: ChainNodeObserver) => value === observer) !== -1;
    }

    async addDelegate(delegate: string): Promise<boolean> {
        if (await this.hasDelegate(delegate)) {
            return false;
        }
        return false;
    }

    async hasDelegate(delegate: string): Promise<boolean> {
        return this.delegates.findIndex((value: string) => value === delegate) !== -1;
    }

    async removeDelegate(delegate: string): Promise<boolean> {
        if (!await this.hasDelegate(delegate)) {
            return false;
        }

        const idx = this.delegates.findIndex((value: string) => value === delegate);
        this.delegates.splice(idx, 1);
        return true;
    }

    /// -----------------------------------------------------------------------
    private onBlockChange(...args: any) {
        console.log('onBlockChange:', args ? JSON.stringify(args) : 'nul');
    }

    private buildIoServer() {
        return `http://${this.nodeheader.ip}:${this.nodeheader.port}`;
    }
}