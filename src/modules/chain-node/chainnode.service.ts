import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io'
import uuid from 'uuid';

import { ChainNode } from './models/node.entity';
import { Delegate } from './models/delegate.entity';
import { NodeHeader, NodeInfo, nodetypeToNumber, DelegateInfo, DelegateHeaderRelatived } from './types';
import { ChainNodeSubject } from './lib/ChainNodeSubject';
import { ChainNodeStateMonitor } from './lib/ChainNodeStateMonitor';

@Injectable()
@WebSocketGateway()
export class ChainNodeService {
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
            this.subjects.delete(findNode.id);
        }

        return this.buildNodeInfo(findNode, findDelegates);
    }

    async addDelegate(delegateRelatived: DelegateHeaderRelatived) {
        const count = await this.delegateRepository.count({ address: delegateRelatived.address });
        if (count > 0) {
            throw new Error('delegate is already exists!');
        }

        const delegateElem = new Delegate();
        delegateElem.address = delegateRelatived.address;
        delegateElem.nodeId = delegateRelatived.id;
        delegateElem.name = delegateRelatived.name;

        await this.delegateRepository.save(delegateElem);

        if (this.subjects.has(delegateElem.nodeId)) {
            this.subjects.get(delegateElem.nodeId).addDelegate(delegateElem.address);
        }

        return delegateElem.address;
    }

    async getDelegate(address: string) {
        const findDelegate = await this.delegateRepository.findOne({ address: address });
        if (findDelegate === undefined) {
            throw new Error('no delegate exists with address(' + address + ')');
        }

        return this.buildDelegateInfo(findDelegate);
    }

    async delDelegate(address: string) {
        const findDelegate = await this.delegateRepository.findOne({ address: address });
        if (findDelegate === undefined) {
            throw new Error('no delegate exists with address(' + address + ')');
        }

        await this.delegateRepository.remove(findDelegate);

        if (this.subjects.has(findDelegate.nodeId)) {
            this.subjects.get(findDelegate.nodeId).removeDelegate(findDelegate.address);
        }

        return this.buildDelegateInfo(findDelegate);
    }

    // ------------------------------------------------------------------------
    private buildNodeInfo(node: ChainNode, delegates: Delegate[]): NodeInfo {
        const result: Partial<NodeInfo> = {};
        result.id = node.id;
        result.ip = node.ip;
        result.port = node.port;

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
        result.address = delegate.address;
        result.nodeId = delegate.nodeId;
        result.publicKey = delegate.publicKey;

        result.blockId = delegate.blockId;
        result.blockHeight = delegate.blockHeight;
        result.blockTimestamp = delegate.blockTimestamp;
        result.blockDate = delegate.blockDate;

        return result as DelegateInfo;
    }
}