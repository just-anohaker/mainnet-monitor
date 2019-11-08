import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io'
import uuid from 'uuid';

import { ChainNode } from './models/node.entity';
import { Delegate } from './models/delegate.entity';
import { NodeHeader, NodeInfo, nodetypeToNumber, DelegateInfo, DelegateHeaderRelatived, BlockHeader } from './types';
import { ChainNodeSubject } from './lib/ChainNodeSubject';
import { ChainNodeStateMonitor } from './lib/ChainNodeStateMonitor';
import { ChainNodeObserver } from "./lib/ChainNodeObserver";
import { EVT_DELEGATE_UPDATE, EVT_HEIGHT_UPDATE, EVT_NODE_UPDATE } from '../../common';

@Injectable()
@WebSocketGateway()
export class ChainNodeService implements ChainNodeObserver {
    @WebSocketServer()
    server: Server;

    private subjects: Map<string, ChainNodeSubject>;

    constructor(
        @InjectRepository(ChainNode)
        private readonly chainnodeRepository: Repository<ChainNode>,
        @InjectRepository(Delegate)
        private readonly delegateRepository: Repository<Delegate>

    ) {
        this.subjects = new Map();

        (async () => {
            const chainNodes = await this.chainnodeRepository.find();
            for (let chainNode of chainNodes) {
                const node: NodeHeader = {
                    ip: chainNode.ip,
                    port: chainNode.port
                }
                const newMonitor = new ChainNodeStateMonitor(chainNode.id, node);
                newMonitor.attackObserver(this);
                const delegates = await this.delegateRepository.find({
                    nodeId: chainNode.id
                });
                for (const delegate of delegates) {
                    newMonitor.addDelegate(delegate.publicKey);
                }
                this.subjects.set(chainNode.id, newMonitor);
            }
        })();
    }

    async addChainNode(node: NodeHeader) {
        const exists = await this.chainnodeRepository.count({
            ip: node.ip,
            port: node.port
        });
        if (exists > 0) {
            throw new Error("chainnode is already exists!");
        }

        const nodeElem = new ChainNode();
        nodeElem.ip = node.ip;
        nodeElem.port = node.port;
        nodeElem.type = nodetypeToNumber(node.type);
        nodeElem.id = uuid.v1();

        await this.chainnodeRepository.save(nodeElem);

        const newMonitor = new ChainNodeStateMonitor(nodeElem.id, node);
        newMonitor.attackObserver(this);
        this.subjects.set(nodeElem.id, newMonitor);
        console.log('newMonitor:', JSON.stringify({ id: nodeElem.id, node }));

        return nodeElem.id;
    }

    async getChainNode(id: string) {
        const findNode = await this.chainnodeRepository.findOne({ id: id });
        if (findNode === undefined) {
            throw new Error('no chainnode exists with id(' + id + ')');
        }

        const findDelegates = await this.delegateRepository.find({ nodeId: id }) || [];
        return this.buildNodeInfo(findNode, findDelegates);
    }

    async delChainNode(id: string) {
        const findNode = await this.chainnodeRepository.findOne({ id: id });
        if (findNode === undefined) {
            throw new Error('no chainnode exists with id(' + id + ')');
        }
        await this.chainnodeRepository.remove(findNode);

        const findDelegates = await this.delegateRepository.find({ nodeId: id }) || [];
        await this.delegateRepository.remove(findDelegates);

        if (this.subjects.has(findNode.id)) {
            this.subjects.get(findNode.id).detachObserver(this);
            this.subjects.delete(findNode.id);
        }

        return this.buildNodeInfo(findNode, findDelegates);
    }

    async addDelegate(delegateRelatived: DelegateHeaderRelatived) {
        const count = await this.delegateRepository.count({ address: delegateRelatived.publicKey });
        if (count > 0) {
            throw new Error('delegate is already exists!');
        }

        const delegateElem = new Delegate();
        delegateElem.publicKey = delegateRelatived.publicKey;
        delegateElem.nodeId = delegateRelatived.id;
        delegateElem.name = delegateRelatived.name;

        await this.delegateRepository.save(delegateElem);

        if (this.subjects.has(delegateElem.nodeId)) {
            this.subjects.get(delegateElem.nodeId).addDelegate(delegateElem.address);
        }

        return delegateElem.publicKey;
    }

    async getDelegate(publickey: string) {
        const findDelegate = await this.delegateRepository.findOne({ publicKey: publickey });
        if (findDelegate === undefined) {
            throw new Error('no delegate exists with address(' + publickey + ')');
        }

        return this.buildDelegateInfo(findDelegate);
    }

    async delDelegate(publicKey: string) {
        const findDelegate = await this.delegateRepository.findOne({ publicKey: publicKey });
        if (findDelegate === undefined) {
            throw new Error('no delegate exists with address(' + publicKey + ')');
        }

        await this.delegateRepository.remove(findDelegate);

        if (this.subjects.has(findDelegate.nodeId)) {
            this.subjects.get(findDelegate.nodeId).removeDelegate(findDelegate.publicKey);
        }

        return this.buildDelegateInfo(findDelegate);
    }

    async allNodes() {
        const chainnodes = await this.chainnodeRepository.find();

        const result: NodeInfo[] = [];
        for (const val of chainnodes) {
            result.push(this.buildNodeInfo(val, []));
        }

        return result;
    }

    async allNodeDetails() {
        const chainnodes = await this.chainnodeRepository.find();

        const result: NodeInfo[] = [];
        for (const val of chainnodes) {
            const relativedDelegates = await this.delegateRepository.find({ nodeId: val.id });
            result.push(this.buildNodeInfo(val, relativedDelegates));
        }
        return result;
    }

    async allDelegates() {
        const delegates = await this.delegateRepository.find();

        const result: DelegateInfo[] = [];
        for (const val of delegates) {
            result.push(this.buildDelegateInfo(val));
        }
        return result;
    }

    // ------------------------------------------------------------------------
    // override
    async onDelegateChanged(nodeId: string, delegatePublicKey: string, blockHeader: BlockHeader) {
        // const msg = `delegateChange(${nodeId}, ${delegatePublicKey}, ${blockHeader.id}, ${blockHeader.height}, ${this.showableDate(this.translateTimestamp(blockHeader.timestamp))})`;
        // console.log(msg);

        await this.updateDelegate(nodeId, delegatePublicKey, blockHeader);

        await this.updateNode(nodeId, blockHeader);
    }

    async onNodeChanged(nodeId: string, nodeHeader: NodeHeader, blockHeader: BlockHeader) {
        // const msg = `nodeChange(${nodeId}, ${blockHeader.id}, ${blockHeader.height}, ${this.showableDate(this.translateTimestamp(blockHeader.timestamp))})`;
        // console.log(msg);

        await this.updateNodeLastest(nodeId, blockHeader);
    }

    // ------------------------------------------------------------------------
    private async updateDelegate(nodeId: string, delegatePublicKey: string, block: BlockHeader) {
        const delegate = await this.delegateRepository.findOne({
            nodeId: nodeId,
            publicKey: delegatePublicKey
        });
        if (delegate !== undefined) {
            delegate.address = block.generatorAddress;
            delegate.blockId = block.id;
            delegate.blockHeight = block.height;
            delegate.blockTimestamp = block.timestamp;
            delegate.blockDate = this.translateTimestamp(block.timestamp);

            this.delegateRepository.save(delegate);

            // TODO
            this.server.emit(EVT_DELEGATE_UPDATE, this.buildDelegateInfo(delegate));
        }
    }

    private async updateNodeLastest(nodeId: string, block: BlockHeader) {
        const chainNode = await this.chainnodeRepository.findOne({ id: nodeId });
        if (chainNode !== undefined) {
            chainNode.status = 0;

            chainNode.lastestHeight = block.height;

            this.chainnodeRepository.save(chainNode);

            // TODO
            this.server.emit(EVT_HEIGHT_UPDATE, this.buildNodeInfo(chainNode, []));
        }
    }

    private async updateNode(nodeId: string, block: BlockHeader) {
        const chainNode = await this.chainnodeRepository.findOne({ id: nodeId });
        if (chainNode !== undefined) {
            chainNode.status = 0;

            chainNode.blockHeight = block.height;
            chainNode.blockId = block.id;
            chainNode.generatorPublicKey = block.generatorPublicKey;
            chainNode.generatorAddress = block.generatorAddress;
            chainNode.blockTimestamp = block.timestamp;
            chainNode.blockDate = this.translateTimestamp(block.timestamp);

            this.chainnodeRepository.save(chainNode);

            // TODO
            this.server.emit(EVT_NODE_UPDATE, this.buildNodeInfo(chainNode, []));
        }
    }

    private buildNodeInfo(node: ChainNode, delegates: Delegate[]): NodeInfo {
        const result: Partial<NodeInfo> = {};
        result.id = node.id;
        result.ip = node.ip;
        result.port = node.port;

        result.lastestHeight = node.lastestHeight;

        result.blockId = node.blockId;
        result.blockHeight = node.blockHeight;
        result.blockTimestamp = node.blockTimestamp;
        result.blockDate = node.blockDate;

        result.generatorAddress = node.generatorAddress;
        result.generatorPublicKey = node.generatorPublicKey;

        result.delegates = [];
        for (const value of delegates) {
            result.delegates.push(this.buildDelegateInfo(value));
        }

        return result as NodeInfo;
    }

    private buildDelegateInfo(delegate: Delegate): DelegateInfo {
        const result: Partial<DelegateInfo> = {};
        result.publicKey = delegate.publicKey;
        result.nodeId = delegate.nodeId;
        result.address = delegate.address;

        result.blockId = delegate.blockId;
        result.blockHeight = delegate.blockHeight;
        result.blockTimestamp = delegate.blockTimestamp;
        result.blockDate = delegate.blockDate;

        return result as DelegateInfo;
    }

    private translateTimestamp(timestamp: number): number {
        const startDate = new Date(Date.UTC(2018, 9, 12, 12, 0, 0, 0));
        const newTime = startDate.getTime() + timestamp * 1000;

        return newTime;
    }

    private showableDate(timestamp: number) {
        const date = new Date();
        date.setTime(timestamp);
        return date.toLocaleDateString();
    }
}