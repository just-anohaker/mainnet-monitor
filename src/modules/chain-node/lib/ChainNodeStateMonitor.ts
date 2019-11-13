import io, { Socket } from "socket.io-client";

import { ChainNodeSubject } from './ChainNodeSubject';
import { NodeHeader, BlockHeader } from '../types';
import { ChainNodeObserver } from './ChainNodeObserver';
import { NodeClient } from './NodeClient';
import { JsonObject } from '../../../common';

export class ChainNodeStateMonitor implements ChainNodeSubject {
    private static TIMEOUT_INTERVAL: number = 3 * 1000;
    private static TIMEOUT_MASK: number = 15 * 1000;
    private static STATUS_INTERVAL: number = 15 * 1000;
    private static STATUS_TRY_TIMES: number = 5;

    private observers: ChainNodeObserver[];
    private delegates: string[];
    private ioClient: typeof Socket;
    private nodeClient: NodeClient;
    private timeoutHandler?: NodeJS.Timeout;
    private statusHandler?: NodeJS.Timeout;
    private tryTimes: number;
    private lastHeight: number;
    private timeoutFlag: number;
    private retry: boolean;

    constructor(private readonly id: string, private readonly nodeheader: NodeHeader) {
        this.observers = [];
        this.delegates = [];
        this.nodeClient = new NodeClient();
        this.tryTimes = 0;
        this.lastHeight = 0;
        this.timeoutFlag = Date.now();
        this.retry = false;

        this.onBlockChange = this.onBlockChange.bind(this);
        this.onTimeout = this.onTimeout.bind(this);
        this.onNodeStatus = this.onNodeStatus.bind(this);

        this.ioClient = io(this.buildIoServer());
        this.ioClient.on('blocks/change', this.onBlockChange);
        function buildInfo(nodeId: string, event: string): [string, () => void] {
            return [
                event,
                (...args: any[]) => console.log(nodeId, event, JSON.stringify(args))
            ];
        }
        this.ioClient.on(...buildInfo(this.id, 'connect'));
        this.ioClient.on(...buildInfo(this.id, 'connect_error'));
        this.ioClient.on(...buildInfo(this.id, 'connect_timeout'));

        this.flushInformations();

        this.timeoutHandler = setTimeout(this.onTimeout, ChainNodeStateMonitor.TIMEOUT_INTERVAL);
        this.statusHandler = setTimeout(this.onNodeStatus, ChainNodeStateMonitor.STATUS_INTERVAL);
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

        this.delegates.push(delegate);
        const newBlock = await this.getDelegate(delegate);
        if (newBlock != null) {
            for (const observer of this.observers) {
                await observer.onDelegateChanged(this.id, newBlock.generatorPublicKey, newBlock);
            }
        }
        return true;
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

    async destory() {
        this.ioClient.close();
        clearTimeout(this.timeoutHandler);
        clearTimeout(this.statusHandler);
    }

    /// -----------------------------------------------------------------------
    private onTimeout() {
        const now = Date.now();
        if (now - this.timeoutFlag > ChainNodeStateMonitor.TIMEOUT_MASK) {
            this.flushInformations()
                .then(() => {
                    this.timeoutFlag = Date.now();
                    this.timeoutHandler = setTimeout(
                        this.onTimeout,
                        ChainNodeStateMonitor.STATUS_INTERVAL
                    );
                })
                .catch(error => {
                    this.timeoutHandler = setTimeout(
                        this.onTimeout,
                        ChainNodeStateMonitor.TIMEOUT_INTERVAL
                    );
                });
            return;
        }

        this.timeoutHandler = setTimeout(
            this.onTimeout,
            ChainNodeStateMonitor.TIMEOUT_INTERVAL
        );
    }

    private onBlockChange() {
        this.timeoutFlag = Date.now();
        this.flushInformations();
    }

    private onNodeStatus() {
        (async () => {
            try {
                const status = await this.getStatus();
                for (const val of this.observers) {
                    val.onNodeStatusChanged(this.id, status);
                }
                this.tryTimes = 0;
            } catch (error) {
                console.log('onNodeStatus error:', this.tryTimes + 1);
                this.tryTimes++;
                if (this.tryTimes > ChainNodeStateMonitor.STATUS_TRY_TIMES) {
                    // 
                    for (const val of this.observers) {
                        val.onNodeStatusChanged(this.id, -1);
                    }
                }
            }
            this.statusHandler = setTimeout(this.onNodeStatus, ChainNodeStateMonitor.STATUS_INTERVAL);
        })();
    }

    // ------------------------------------------------------------------------
    // helpers
    private async flushInformations() {
        if (this.retry) return;

        this.retry = true;
        try {
            const newHeight = await this.getHeight();
            const newBlock = await this.getBlock(newHeight);
            for (const observer of this.observers) {
                await observer.onNodeChanged(this.id, this.nodeheader, newBlock);
            }
            if (this.lastHeight + 1 !== newHeight) {
                // TODO: update delegates;
                for (const delegate of this.delegates) {
                    const newBlock = await this.getDelegate(delegate);
                    if (newBlock != null) {
                        for (const observer of this.observers) {
                            await observer.onDelegateChanged(this.id, newBlock.generatorPublicKey, newBlock);
                        }
                    }
                }
            } else {
                if (this.delegates.findIndex((val: string) => val === newBlock.generatorPublicKey) !== -1) {
                    for (const observer of this.observers) {
                        await observer.onDelegateChanged(this.id, newBlock.generatorPublicKey, newBlock);
                    }
                }
            }

        } catch (error) {
            // TODO
        }
        this.retry = false;
    }

    private async getHeight() {
        const heightResp = await this.nodeClient.get(this.buildGetHeightUrl());
        return heightResp.height as number;
    }

    private async getBlock(height: number) {
        const blockResp = await this.nodeClient.get(this.buildGetBlockUrl(), { height });
        return this.buildBlockHeader(blockResp.block);
    }

    private async getDelegate(publicKey: string) {
        const lastBlockResp = await this.nodeClient.get(
            this.buildGetBlocksUrl(),
            {
                generatorPublicKey: publicKey,
                limit: 1,
                orderBy: 'height:desc'
            }
        );
        const blocks = lastBlockResp.blocks;
        return blocks.length <= 0 ? undefined : this.buildBlockHeader(blocks[0]);
    }

    private async getStatus() {
        await this.nodeClient.get(this.buildGetHeightUrl(), {});

        const statusResp = await this.nodeClient.get(this.buildGetStatusUrl(), {});
        return statusResp.syncing ? 1 : 0;
    }

    private buildIoServer() {
        return `http://${this.nodeheader.ip}:${this.nodeheader.port}`;
    }

    private buildGetHeightUrl() {
        return this.buildIoServer() + '/api/blocks/getHeight';
    }

    private buildGetBlockUrl() {
        return this.buildIoServer() + '/api/blocks/get';
    }

    private buildGetBlocksUrl() {
        return this.buildIoServer() + '/api/blocks';
    }

    private buildGetStatusUrl() {
        return this.buildIoServer() + '/api/loader/status/sync';
    }

    // private async initNode() {
    //     try {
    //         const heightResp = await this.nodeClient.get(this.buildGetHeightUrl());
    //         await this.getBlock(heightResp.height);
    //     } catch (error) {
    //         console.log('initNode: ', error.toString());
    //     }
    // }

    // private async initDelegate(delegate: string) {
    //     try {
    //         const lastBlockResp = await this.nodeClient.get(
    //             this.buildGetBlocksUrl(),
    //             {
    //                 generatorPublicKey: delegate,
    //                 limit: 1,
    //                 orderBy: 'height:desc'
    //             }
    //         );
    //         const blocks = lastBlockResp.blocks;
    //         if (blocks.length <= 0) {
    //             throw new Error('no block generated by ' + delegate);
    //         }
    //         const blockHeader: BlockHeader = this.buildBlockHeader(blocks[0]);
    //         for (const val of this.observers) {
    //             await val.onDelegateChanged(this.id, delegate, blockHeader);
    //         }
    //     } catch (error) {
    //         console.log('initDelegate: ', error.toString());
    //     }
    // }

    // private async getBlock(height: number) {
    //     try {
    //         const blockResp = await this.nodeClient.get(this.buildGetBlockUrl(), { height });

    //         const blockHeader = this.buildBlockHeader(blockResp.block);
    //         const generator = blockResp.block.generatorPublicKey;
    //         for (const val of this.observers) {
    //             await val.onNodeChanged(this.id, this.nodeheader, blockHeader);
    //         }
    //         if (this.delegates.findIndex((val: string) => generator === val) !== -1) {
    //             for (const val of this.observers) {
    //                 await val.onDelegateChanged(this.id, generator, blockHeader);
    //             }
    //         }
    //     } catch (error) {
    //         console.log('getBlock: ', error.toString());
    //     }
    // }

    private buildBlockHeader(block: JsonObject): BlockHeader {
        const result: BlockHeader = {
            id: block.id,
            height: block.height,
            generatorPublicKey: block.generatorPublicKey,
            generatorId: block.generatorId,
            timestamp: block.timestamp
        };

        return result;
    }
}