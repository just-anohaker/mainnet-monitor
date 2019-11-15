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
    private static HEIGHT_DIFF: number = 1 * 1000;
    private static STATUS_SCHEDULER: number = 200;
    private static STATUS_DIFF: number = 10 * 1000;
    private static UPDATE_SCHEDULER: number = 200;
    private static UPDATE_DIFF: number = 2 * 1000;
    private static DELEGATE_SCHEDULER: number = 200;
    private static MONITOR_INTERVAL: number = 15 * 1000;
    private static MONITABLE: boolean = false;

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
    private delegatePc: number;

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
        this.delegatePc = 0;

        this.onHeightScheduler = this.onHeightScheduler.bind(this);
        this.onStatusScheduler = this.onStatusScheduler.bind(this);
        this.onUpdateScheduler = this.onUpdateScheduler.bind(this);
        this.onDelegateScheduler = this.onDelegateScheduler.bind(this);


        const monit = () => {
            (async () => {
                const allNodes = await this.entityService.getAllNodes();
                const allDelegates = await this.entityService.getAllDelegates();

                this.logger.log(`monit has node(${allNodes.length}), delegate(${allDelegates.length})`);
                this.logger.log(`monit local has node(${this.chainnodes.length}), delegate(${this.delegates.length}), cache(${this.cache.size})`);

                setTimeout(monit, ChainNodeService.MONITOR_INTERVAL);
            })();
        }
        ChainNodeService.MONITABLE && setTimeout(monit, ChainNodeService.MONITOR_INTERVAL);

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
        this.cache.set(newNode.id, Object.assign({}, NULLABLE_CACHE));
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
        if (this.chainnodes.length <= 0) {
            this.logger.log(`delNode has node(${this.chainnodes.length}), delegate(${this.delegates.length})`);
        }
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
        const [del] = this.delegates.splice(idx, 1);
        this.logger.log(`delDelegate {${del.id.substring(0, 8)}, ${del.publicKey.substring(0, 8)}}`);
        const withServer = this.chainnodes.find((val: ChainNode) => val.id === del.id);
        if (withServer == null) {
            const ids: string[] = [];
            for (let chainnode of this.chainnodes) {
                ids.push(chainnode.id);
            }
            this.logger.log(`delDelegate chainnode unfounded {${del.id}}, ${ids}`);
            return;
        }

        const validDelegates = this.delegates
            .filter((val: Delegate) => val.id == withServer.id);
        if (validDelegates.length > 0) {
            const resultDelegate = validDelegates
                .reduce((pVal: Delegate, cVal: Delegate) => pVal.blockHeight > cVal.blockHeight ? pVal : cVal);
            if (resultDelegate.blockHeight === -1) {
                await this.updateNode(withServer, EMPTY_BLOCK, true);
            } else {
                await this.updateNode(withServer, this.toBlock(resultDelegate), true);
            }
        } else {
            await this.updateNode(withServer, EMPTY_BLOCK, true);
        }
        this.ioService.emitNodeUpdate(this.toNodeDTO(withServer, []));
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
                if (now - cache.heightTimestamp > ChainNodeService.HEIGHT_DIFF) {
                    cache.heightTimestamp = now;
                    const maybeHeight = await this.blockchainService.getHeight(node);
                    if (maybeHeight != null && cache.height != maybeHeight!) {
                        if (cache.height > maybeHeight!) {
                            this.logger.log(`Maybe blockchain start backup or recovery! {${cache.height},${maybeHeight!}}`);
                            node.lastestHeight = maybeHeight! - 1;
                            for (let val of this.delegates) {
                                if (val.id === node.id) {
                                    val.blockHeight = -1;
                                }
                            }
                        } else {
                            node.lastestHeight = node.lastestHeight === -1 ? maybeHeight - 1 : node.lastestHeight;
                        }
                        cache.height = maybeHeight!;
                        this.logger.log(`onHeightScheduler {${node.id.substring(0, 8)}, ${maybeHeight!}}`);
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
            if (this.chainnodes.length > 0) {
                const now = Date.now();
                const index = this.statusPc;
                this.statusPc++;
                const node = this.chainnodes[index % this.chainnodes.length];
                const cache = this.cache.get(node.id);
                if (now - cache.statusTimestamp > ChainNodeService.STATUS_DIFF) {
                    cache.statusTimestamp = now;
                    const newStatus = await this.blockchainService.getStatus(node);
                    if (node.status != newStatus.status) {
                        node.status = newStatus.status;
                        this.hasNode(node) && await this.entityService.updateNode(node);
                        this.hasNode(node) && await this.ioService.emitStatusUpdate(this.toNodeDTO(node, []));
                        this.logger.log(`onStatusScheduler {${node.id.substring(0, 8)}, ${newStatus.status}}`);
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
                    && now - cache.updateTimestamp > ChainNodeService.UPDATE_DIFF
                    && node.lastestHeight < cache.height
                ) {
                    cache.updateTimestamp = now;
                    const limit = cache.height - node.lastestHeight;
                    let maybeBlocks: BlockChainBlock[] = null;
                    if (limit === 1) {
                        const maybeBlock = await this.blockchainService.getBlock(node, node.lastestHeight + 1);
                        maybeBlocks = maybeBlock ? [maybeBlock] : maybeBlocks;
                    } else {
                        maybeBlocks = await this.blockchainService.getBlocks(node, node.lastestHeight, limit);
                    }
                    let lastUpdateNode: ChainNode = null;
                    let lastUpdateDelegate: Delegate = null;
                    if (maybeBlocks != null) {
                        for (const block of maybeBlocks) {
                            node.lastestHeight = block.height;
                            this.hasNode(node) && await this.entityService.updateNode(node);

                            for (let val of this.delegates) {
                                if (val.id === node.id && val.publicKey === block.generatorPublicKey) {
                                    lastUpdateNode = this.hasNode(node) && await this.updateNode(node, block)
                                        ? node
                                        : lastUpdateNode;
                                    lastUpdateDelegate = this.hasDelegate(val) && await this.updateDelegate(val, block)
                                        ? val
                                        : lastUpdateDelegate;
                                }
                            }
                        }

                        if (maybeBlocks.length > 0) {
                            await this.ioService.emitHeightUpdate(this.toNodeDTO(node, []));
                            lastUpdateNode
                                && await this.ioService.emitNodeUpdate(this.toNodeDTO(lastUpdateNode, []));
                            lastUpdateDelegate
                                && await this.ioService.emitDelegateUpdate(this.toDelegateDTO(lastUpdateDelegate));
                            let msg = `onUpdateScheduler {${node.id.substring(0, 8)}`;
                            msg += `, ${node.lastestHeight}`;
                            msg += lastUpdateNode ? `, ${lastUpdateNode.blockHeight}, ${lastUpdateDelegate.address}` : "";
                            msg += '}';
                            this.logger.log(msg);

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
            const uninitDelegates = this.delegates.filter((val: Delegate) => val.blockHeight === -1);
            if (uninitDelegates.length > 0) {
                const index = this.delegatePc;
                this.delegatePc++;
                const uninitDelegate = uninitDelegates[index % uninitDelegates.length];
                const withServer = this.chainnodes.find(
                    (val: ChainNode) => val.id === uninitDelegate.id
                );
                const maybeBlock = await this.blockchainService.getLastGeneratedBock(
                    withServer,
                    uninitDelegate.publicKey
                );
                if (maybeBlock != null) {
                    this.hasNode(withServer)
                        && await this.updateNode(withServer, maybeBlock)
                        && await this.ioService.emitNodeUpdate(this.toNodeDTO(withServer, []));
                    this.hasDelegate(uninitDelegate)
                        && await this.updateDelegate(uninitDelegate, maybeBlock)
                        && await this.ioService.emitDelegateUpdate(this.toDelegateDTO(uninitDelegate));
                    this.logger.log(`onDelegateScheduler {${maybeBlock.height}, ${maybeBlock.generatorId}}`);
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
            await this.addNode(n);
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

    private async updateNode(withServer: ChainNode, block: BlockChainBlock, force: boolean = false) {
        if (force && block === EMPTY_BLOCK || withServer.blockHeight < block.height) {
            withServer.blockHeight = block.height;
            withServer.blockId = block.id;
            withServer.blockTimestamp = block.timestamp;
            withServer.blockDate = this.toBlockDate(block.timestamp);
            withServer.generatorPublicKey = block.generatorPublicKey;
            withServer.generatorAddress = block.generatorId;

            this.hasNode(withServer) && await this.entityService.updateNode(withServer);
            return true;
            // this.hasNode(withServer) && await this.ioService.emitNodeUpdate(this.toNodeDTO(withServer, []));
        }
        return false;
    }

    private async updateDelegate(delegate: Delegate, block: BlockChainBlock) {
        if (delegate.blockHeight < block.height) {
            delegate.address = block.generatorId;
            delegate.blockId = block.id;
            delegate.blockHeight = block.height;
            delegate.blockTimestamp = block.timestamp;
            delegate.blockDate = this.toBlockDate(block.timestamp);

            this.hasDelegate(delegate) && await this.entityService.updateDelegate(delegate);
            return true;
            // this.hasDelegate(delegate) && await this.ioService.emitDelegateUpdate(this.toDelegateDTO(delegate));
        }
        return false;
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
        const result: NodeDto = Object.assign({}, node) as any;
        result.delegates = [];
        for (const val of delegates) {
            result.delegates.push(this.toDelegateDTO(val));
        }
        return result;
    }

    private toDelegateDTO(delegate: Delegate): DelegateDto {
        const result: DelegateDto = Object.assign({}, delegate) as any;
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