import { Injectable, Logger } from '@nestjs/common';

import { ChainNodeIOService } from './socketio.service';
import { ChainNodeEntityService } from './entity.service';
import { BlockChainService } from './blockchain.service';

import { ChainNode } from './models/node.entity';
import { Delegate } from './models/delegate.entity';
import { NodeDto } from './dto/node.dto';
import { DelegateDto } from './dto/delegate.dto';
import { BlockChainBlock, EMPTY_BLOCK } from './interfaces/blockchain.interface';

type ChainNodeCache = {
    height: number;
    heightTimestamp: number;
    statusTimestamp: number;
    updateTimestamp: number;
}

const NULLABLE_CACHE: ChainNodeCache = {
    height: -1,
    heightTimestamp: 0,
    statusTimestamp: 0,
    updateTimestamp: 0
};

@Injectable()
export class ChainNodeService {
    private static HEIGHT_SCHEDULER: number = 200;
    private static STATUS_SCHEDULER: number = 200;
    private static UPDATE_SCHEDULER: number = 200;
    private static DELEGATE_SCHEDULER: number = 200;

    private logger: Logger = new Logger('ChainNodeService', true);
    private chainnodes: ChainNode[];
    private delegates: Delegate[];
    private cache: Map<string, ChainNodeCache>;

    private heightSched: NodeJS.Timeout;
    private statusSched: NodeJS.Timeout;
    private updateSched: NodeJS.Timeout;
    private delegateSched: NodeJS.Timeout;
    private heightPc: number;
    private statusPc: number;
    private updatePc: number;

    constructor(
        private readonly ioService: ChainNodeIOService,
        private readonly entityService: ChainNodeEntityService,
        private readonly blockchainService: BlockChainService
    ) {
        this.chainnodes = [];
        this.delegates = [];
        this.cache = new Map();
        this.heightPc = 0;
        this.statusPc = 0;
        this.updatePc = 0;

        this.onHeightScheduler = this.onHeightScheduler.bind(this);
        this.onStatusScheduler = this.onStatusScheduler.bind(this);
        this.onUpdateScheduler = this.onUpdateScheduler.bind(this);
        this.onDelegateScheduler = this.onDelegateScheduler.bind(this);

        // Init
        this.init()
            .then(() => {
                this.startSchedulers();
            })
            .catch(error => {
                this.startSchedulers();
            });
    }

    async addNode(newNode: ChainNode, logger: boolean = true) {
        if (this.hasNode(newNode)) return;

        logger && this.logger.log(`addNode {${newNode.id.substring(0, 8)}}`)

        this.chainnodes.push(newNode);
        this.cache.set(newNode.id, Object.assign(NULLABLE_CACHE));
        // TODO
    }

    async delNode(delNode: ChainNode) {
        if (!this.hasNode(delNode)) return;

        const idx = this.chainnodes.findIndex(
            (val: ChainNode) => val.id === delNode.id
        );
        const dels = this.chainnodes.splice(idx, 1);
        this.logger.log(`delNode {${dels[0].id.substring(0, 8)}}`);
        this.delegates = this.delegates
            .filter((val: Delegate) => val.id !== delNode.id);
        this.cache.delete(delNode.id);
        // TODO
    }

    async addDelegate(newDelegate: Delegate, logger: boolean = true) {
        if (this.hasDelegate(newDelegate)) return;

        logger && this.logger.log(`addDelegate {${newDelegate.publicKey.substring(0, 8)}}`);

        this.delegates.push(newDelegate);
        // TODO
    }

    async delDelegate(delDelegate: Delegate) {
        if (!this.hasDelegate(delDelegate)) return;

        const idx = this.delegates.findIndex(
            (val: Delegate) => val.publicKey === delDelegate.publicKey
        );
        const dels = this.delegates.splice(idx, 1);
        this.logger.log(`delDelegate {${dels[0].publicKey.substring(0, 8)}}`);
        const validDelegates = this.delegates
            .filter((val: Delegate) => val.id == delDelegate.id);
        if (validDelegates.length > 0) {
            const resultDelegate = validDelegates
                .reduce((pVal: Delegate, cVal: Delegate) => pVal.blockHeight > cVal.blockHeight ? pVal : cVal);
            const withServer = this.chainnodes.find((val: ChainNode) => val.id === delDelegate.id);
            if (!withServer) return;
            if (resultDelegate.blockHeight === -1) {
                await this.updateNode(withServer, EMPTY_BLOCK);
            } else {
                await this.updateNode(withServer, this.toBlock(resultDelegate));
            }
        }
    }

    ////
    // scheduler
    private onHeightScheduler() {
        clearTimeout(this.heightSched);
        (async () => {
            if (this.chainnodes.length > 0) {
                const now = Date.now();
                const index = this.heightPc;
                this.heightPc++;
                const node = this.chainnodes[index % this.chainnodes.length];
                const cache = this.cache.get(node.id);
                if (now - cache.heightTimestamp > 2 * 1000) {
                    cache.heightTimestamp = now;
                    const maybeHeight = await this.blockchainService.getHeight(node);
                    if (maybeHeight != null && cache.height != maybeHeight!) {
                        if (cache.height > maybeHeight!) {
                            this.logger.log(`Maybe blockchain start backup or recovery! {${cache.height},${maybeHeight!}}`);
                            node.lastestHeight = maybeHeight!;
                            for (let val of this.delegates) {
                                if (val.id === node.id) {
                                    val.blockHeight = -1;
                                }
                            }
                        } else {
                            node.lastestHeight = node.lastestHeight === -1 ? maybeHeight : node.lastestHeight;
                        }
                        cache.height = maybeHeight!;
                        // node.lastestHeight = maybeHeight;
                        // this.hasNode(node) && await this.entityService.updateNode(node);
                        // this.hasNode(node) && await this.ioService.emitHeightUpdate(this.toNodeDTO(node, []));
                    }
                }
            }
            this.heightSched = setTimeout(
                this.onHeightScheduler,
                ChainNodeService.HEIGHT_SCHEDULER
            );
        })();

    }

    private onStatusScheduler() {
        clearTimeout(this.statusSched);
        (async () => {
            if (this.chainnodes.length) {
                const now = Date.now();
                const index = this.statusPc;
                this.statusPc++;
                const node = this.chainnodes[index % this.chainnodes.length];
                const cache = this.cache.get(node.id);
                if (now - cache.statusTimestamp > 30 * 1000) {
                    cache.statusTimestamp = now;
                    const maybeStatus = await this.blockchainService.getStatus(node);
                    if (maybeStatus != null && node.status != (maybeStatus!.syncing ? 1 : 0)) {
                        node.status = (maybeStatus!.syncing ? 1 : 0);
                        this.hasNode(node) && await this.entityService.updateNode(node);
                        this.hasNode(node) && await this.ioService.emitStatusUpdate(this.toNodeDTO(node, []));
                    }
                }
            }
            this.statusSched = setTimeout(
                this.onStatusScheduler,
                ChainNodeService.STATUS_SCHEDULER
            );
        })();
    }

    private onUpdateScheduler() {
        clearTimeout(this.updateSched);
        (async () => {
            if (this.chainnodes.length > 0) {
                const now = Date.now();
                const index = this.updatePc;
                this.updatePc++;
                const node = this.chainnodes[index % this.chainnodes.length];
                const cache = this.cache.get(node.id);
                if (
                    node.lastestHeight !== -1
                    && now - cache.updateTimestamp > 2 * 1000
                    && node.lastestHeight <= cache.height
                ) {
                    cache.updateTimestamp = now;
                    const maybeBlock = await this.blockchainService.getBlock(node, node.lastestHeight + 1);
                    if (maybeBlock != null) {
                        node.lastestHeight = maybeBlock!.height;
                        this.hasNode(node) && await this.entityService.updateNode(node);
                        this.hasNode(node) && await this.ioService.emitHeightUpdate(this.toNodeDTO(node, []));

                        for (let val of this.delegates) {
                            if (val.id === node.id && val.publicKey === maybeBlock!.generatorPublicKey) {
                                await this.updateNode(node, maybeBlock);
                                await this.updateDelegate(val, maybeBlock);
                                break;
                            }
                        }
                    }
                }
            }
            this.updateSched = setTimeout(
                this.onUpdateScheduler,
                ChainNodeService.UPDATE_SCHEDULER
            );
        })();
    }

    private onDelegateScheduler() {
        clearTimeout(this.delegateSched);

        (async () => {
            const uninitDelegate = this.delegates.find(
                (val: Delegate) => val.blockHeight === -1
            );
            if (uninitDelegate != null) {
                // founded
                const withServer = this.chainnodes.find(
                    (val: ChainNode) => val.id === uninitDelegate.id
                );
                const maybeBlock = await this.blockchainService.getLastGeneratedBock(
                    withServer,
                    uninitDelegate.publicKey
                );
                if (maybeBlock != null && uninitDelegate.blockHeight !== -1) {
                    await this.updateNode(withServer, maybeBlock);
                    await this.updateDelegate(uninitDelegate, maybeBlock);
                }
            }
            this.delegateSched = setTimeout(
                this.onDelegateScheduler,
                ChainNodeService.DELEGATE_SCHEDULER
            );
        })();
    }

    ////
    private async init() {
        const allNodes = await this.entityService.getAllNodes();
        this.logger.log(`init allNodes: ${JSON.stringify(allNodes, null, 2)}`);
        for (const n of allNodes) {
            n.lastestHeight = -1;
            await this.addNode(n, false);
        }
        const allDelegates = await this.entityService.getAllDelegates();
        this.logger.log(`init allDelegates: ${JSON.stringify(allDelegates, null, 2)}`);
        for (const d of allDelegates) {
            d.blockHeight = -1;
            await this.addDelegate(d);
        }
    }

    private startSchedulers() {
        this.heightSched = setTimeout(
            this.onHeightScheduler,
            ChainNodeService.HEIGHT_SCHEDULER
        );
        this.statusSched = setTimeout(
            this.onStatusScheduler,
            ChainNodeService.STATUS_SCHEDULER
        );
        this.updateSched = setTimeout(
            this.onUpdateScheduler,
            ChainNodeService.UPDATE_SCHEDULER
        );
        this.delegateSched = setTimeout(
            this.onDelegateScheduler,
            ChainNodeService.DELEGATE_SCHEDULER
        );
    }

    private async updateNode(withServer: ChainNode, block: BlockChainBlock) {
        if (block === EMPTY_BLOCK || withServer.blockHeight < block.height) {
            withServer.blockHeight = block.height;
            withServer.blockId = block.id;
            withServer.blockTimestamp = block.timestamp;
            withServer.blockDate = this.toBlockDate(block.timestamp);
            withServer.generatorPublicKey = block.generatorPublicKey;
            withServer.generatorAddress = block.generatorId;

            this.hasNode(withServer) && await this.entityService.updateNode(withServer);
            this.hasNode(withServer) && await this.ioService.emitNodeUpdate(this.toNodeDTO(withServer, []));
        }
    }

    private async updateDelegate(delegate: Delegate, block: BlockChainBlock) {
        delegate.address = block.generatorId;
        delegate.blockId = block.id;
        delegate.blockHeight = block.height;
        delegate.blockTimestamp = block.timestamp;
        delegate.blockDate = this.toBlockDate(block.timestamp);

        this.hasDelegate(delegate) && await this.entityService.updateDelegate(delegate);
        this.hasDelegate(delegate) && await this.ioService.emitDelegateUpdate(this.toDelegateDTO(delegate));
    }

    private hasNode(data: ChainNode): boolean {
        return this.chainnodes.findIndex(
            (val: ChainNode) => val.id === data.id
        ) !== -1;
    }

    private hasDelegate(data: Delegate): boolean {
        return this.delegates.findIndex(
            (val: Delegate) => val.publicKey === data.publicKey
        ) != -1;
    }

    private toNodeDTO(node: ChainNode, delegates: Delegate[]): NodeDto {
        const result: NodeDto = Object.assign(node);
        result.delegates = [];
        for (const val of delegates) {
            result.delegates.push(val);
        }
        return result;
    }

    private toDelegateDTO(delegate: Delegate): DelegateDto {
        const result: DelegateDto = Object.assign(delegate);
        return result;
    }

    private toBlock(delegate: Delegate): BlockChainBlock {
        const result: BlockChainBlock = {
            id: delegate.blockId,
            height: delegate.blockHeight,
            timestamp: delegate.blockTimestamp,
            generatorPublicKey: delegate.publicKey,
            generatorId: delegate.address
        };
        return result;
    }

    private toBlockDate(timestamp: number) {
        const startDate = new Date(Date.UTC(2018, 9, 12, 12, 0, 0, 0));
        const newTime = startDate.getTime() + timestamp * 1000;

        return newTime;
    }
}