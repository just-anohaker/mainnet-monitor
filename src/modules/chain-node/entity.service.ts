import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import uuid from 'uuid';

import { ChainNode } from './models/node.entity';
import { Delegate } from './models/delegate.entity';
import { CreateNodeDto, DelNodeDto } from './dto/node.dto';
import { CreateDelegateDto, DelDelegateDto } from './dto/delegate.dto';

@Injectable()
export class ChainNodeEntityService {
    private logger: Logger = new Logger('ChainNodeEntityService', true);

    constructor(
        @InjectRepository(ChainNode)
        private readonly chainnodeRepo: Repository<ChainNode>,
        @InjectRepository(Delegate)
        private readonly delegateRepo: Repository<Delegate>
    ) { }

    async createNode(data: CreateNodeDto): Promise<ChainNode> {
        const exists = await this.chainnodeRepo.count({
            ip: data.ip,
            port: data.port
        });
        if (exists > 0) {
            throw new Error('chainnode is already exists!');
        }

        const newNode = new ChainNode();
        newNode.id = uuid.v1();
        newNode.ip = data.ip;
        newNode.port = data.port;
        newNode.name = data.name;
        newNode.type = data.type;
        newNode.status = -1;

        await this.chainnodeRepo.save(newNode);

        this.logger.log(`addNode {${newNode.id.substring(0, 8)}, ${newNode.ip}, ${newNode.port}}`);

        return newNode;
    }

    async getNodeById(nodeId: string): Promise<ChainNode> {
        const fNode = await this.chainnodeRepo.findOne({ id: nodeId });
        if (fNode == null) {
            throw new Error(`no chainnode(${nodeId}) exists!`);
        }
        return fNode;
    }

    async getAllNodes(): Promise<ChainNode[]> {
        const fNodes = await this.chainnodeRepo.find() || [];
        return fNodes;
    }

    async delNode(data: DelNodeDto): Promise<ChainNode> {
        const dResult = await this.chainnodeRepo.delete({ id: data.id });
        if (dResult.affected <= 0) {
            throw new Error(`no chainnode(${data.id}) exists!`);
        }
        const dNode = dResult.raw as ChainNode;
        this.logger.log(`delNode {${dNode.id.substring(0, 8)}}`);
        return dNode;
    }

    async createDelegate(data: CreateDelegateDto): Promise<Delegate> {
        const count = await this.delegateRepo.count({ id: data.id, publicKey: data.publicKey });
        if (count > 0) {
            throw new Error(`delegate(${data.publicKey}) exists!`);
        }

        const newDelegate = new Delegate();
        newDelegate.id = data.id;
        newDelegate.publicKey = data.publicKey;
        newDelegate.name = data.name;

        await this.delegateRepo.save(newDelegate);

        this.logger.log(`createDelegate {${newDelegate.id.substring(0, 8)}, ${newDelegate.publicKey}}`);

        return newDelegate;
    }

    async getDelegateByPublicKey(publicKey: string): Promise<Delegate> {
        const fDelegate = await this.delegateRepo.findOne({ publicKey });
        if (fDelegate == null) {
            throw new Error(`delegate(${fDelegate.publicKey}) not exists!`);
        }

        return fDelegate;
    }

    async getDelegatesByNodeId(nodeId: string): Promise<Delegate[]> {
        const fDelegates = await this.delegateRepo.find({ id: nodeId }) || [];
        return fDelegates;
    }

    async getAllDelegates(): Promise<Delegate[]> {
        const fDelegates = await this.delegateRepo.find() || [];
        return fDelegates;
    }

    async delDelegate(data: DelDelegateDto): Promise<Delegate> {
        const dResult = await this.delegateRepo.delete({ publicKey: data.publicKey });
        if (dResult.affected <= 0) {
            throw new Error(`delegate(${data.publicKey}) not exists!`);
        }

        const dDelegate = dResult.raw as Delegate;
        this.logger.log(`delDelegate {${dDelegate.id.substring(0, 8)}, ${dDelegate.publicKey.substring(0, 8)}}`)

        return dDelegate;
    }

    async delDelegatesByNodeId(data: DelDelegateDto): Promise<Delegate[] | Delegate> {
        const dResult = await this.delegateRepo.delete({ id: data.nodeId });
        if (dResult.affected <= 0) {
            throw new Error(`chainnode(${data.nodeId}) do not has delegate!`);
        }

        const dDelegates = (dResult.raw as Delegate[]) || [];
        this.logger.log(`delDelegatesByNodeId {${data.nodeId.substring(0, 8)}, count(${dDelegates.length})}`);

        return dDelegates;
    }

    async updateNode(newData: ChainNode) {
        this.logger.log(`updateNode {${newData.id.substring(0, 8)}, ${newData.lastestHeight}, ${newData.blockHeight}}`);

        await this.chainnodeRepo.save(newData);
    }

    async updateDelegate(newData: Delegate) {
        this.logger.log(`updateDelegate {${newData.publicKey.substring(0, 8)}, ${newData.blockHeight}}`);

        await this.delegateRepo.save(newData);
    }
}
