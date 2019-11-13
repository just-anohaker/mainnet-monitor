import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import uuid from 'uuid';

import { ChainNode } from './models/node.entity';
import { Delegate } from './models/delegate.entity';
import { CreateNodeDto, DelNodeDto } from './dto/node.dto';
import { CreateDelegateDto, DelDelegateDto } from './dto/delegate.dto';

@Injectable()
export class ChainNodeEntityService {
    constructor(
        @InjectRepository(ChainNode)
        private readonly chainnodeRepo: Repository<ChainNode>,
        @InjectRepository(Delegate)
        private readonly delegateRepo: Repository<Delegate>
    ) { }

    async addNode(data: CreateNodeDto): Promise<ChainNode> {
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
        const dNode = await this.chainnodeRepo.delete({ id: data.id });
        if (dNode.affected <= 0) {
            throw new Error(`no chainnode(${data.id}) exists!`);
        }
        // TODO
        return dNode.raw as ChainNode;
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
        const dDelegate = await this.delegateRepo.delete({ publicKey: data.publicKey });
        if (dDelegate.affected <= 0) {
            throw new Error(`delegate(${data.publicKey}) not exists!`);
        }

        return dDelegate.raw as Delegate;
    }

    async delDelegatesByNodeId(data: DelDelegateDto): Promise<Delegate[] | Delegate> {
        const dDelegates = await this.delegateRepo.delete({ id: data.nodeId });
        if (dDelegates.affected <= 0) {
            throw new Error(`chainnode(${data.nodeId}) do not has delegate!`);
        }

        return dDelegates.raw || [];
    }

    async updateNode(newData: ChainNode) {
        await this.chainnodeRepo.save(newData);
    }

    async updateDelegate(newData: Delegate) {
        await this.delegateRepo.save(newData);
    }
}
