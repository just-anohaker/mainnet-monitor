import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import uuid from 'uuid';

import { ChainNode } from './models/node.entity';
import { Mails } from './models/mail.entity';
import { Delegate } from './models/delegate.entity';
import { CreateMailDto, DelMailDto } from './dto/mail.dto';
import { CreateNodeDto, DelNodeDto } from './dto/node.dto';
import { CreateDelegateDto, DelDelegateDto } from './dto/delegate.dto';


@Injectable()
export class ChainNodeEntityService {
    private logger: Logger = new Logger('ChainNodeEntityService', true);

    constructor(
        @InjectRepository(ChainNode)
        private readonly chainnodeRepo: Repository<ChainNode>,
        @InjectRepository(Delegate)
        private readonly delegateRepo: Repository<Delegate>,
        @InjectRepository(Mails)
        private readonly mailRepo: Repository<Mails>
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
        newNode.status = 0;
        newNode.lastestHeight = -1;

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
    async getOneSeedNode(): Promise<ChainNode> {
        const fNode = await this.chainnodeRepo.findOne({
            where: { type: 1 }, order: {
                ip: "DESC"
            }
        });
        return fNode;
    }
    async delNode(data: DelNodeDto): Promise<ChainNode> {
        const findNode = await this.chainnodeRepo.findOne({ id: data.id });
        if (findNode == null) {
            throw new Error(`no chainnode(${data.id}) exists!`);
        }
        await this.chainnodeRepo.delete(findNode);
        await this.delegateRepo.delete({ id: findNode.id });
        this.logger.log(`delNode {${data.id.substring(0, 8)}}`);
        return findNode;
    }

    async createDelegate(data: CreateDelegateDto): Promise<Delegate> {
        const nodeCount = await this.chainnodeRepo.count({ id: data.id });
        if (nodeCount <= 0) {
            throw new Error(`create delegate with no chainnode(${data.id})`);
        }
        const count = await this.delegateRepo.count({ publicKey: data.publicKey });
        if (count > 0) {
            throw new Error(`delegate(${data.publicKey}) exists!`);
        }

        const newDelegate = new Delegate();
        newDelegate.id = data.id;
        newDelegate.publicKey = data.publicKey;
        newDelegate.name = data.name;
        newDelegate.blockHeight = -1;

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
        const findDelegate = await this.delegateRepo.findOne({ publicKey: data.publicKey });
        if (findDelegate == null) {
            throw new Error(`delegate(${data.publicKey}) not exists!`);
        }
        await this.delegateRepo.delete(findDelegate);
        this.logger.log(`delDelegate {${findDelegate.id.substring(0, 8)}, ${findDelegate.publicKey.substring(0, 8)}}`)

        return findDelegate;
    }

    async delDelegatesByNodeId(data: DelDelegateDto): Promise<Delegate[] | Delegate> {
        const findDelegates = await this.delegateRepo.find({ id: data.nodeId });
        if (findDelegates.length <= 0) {
            throw new Error(`chainnode(${data.nodeId}) do not has delegate!`);
        }
        for (const dDelegate of findDelegates) {
            await this.delegateRepo.delete(dDelegate);
        }
        this.logger.log(`delDelegatesByNodeId {${data.nodeId.substring(0, 8)}, count(${findDelegates.length})}`);

        return findDelegates;
    }

    async updateNode(newData: ChainNode) {
        this.logger.log(`updateNode {${newData.id.substring(0, 8)}, ${newData.lastestHeight}, ${newData.blockHeight}}`);

        await this.chainnodeRepo.save(newData);
    }

    async updateDelegate(newData: Delegate) {
        this.logger.log(`updateDelegate {${newData.publicKey.substring(0, 8)}, ${newData.blockHeight}}`);

        await this.delegateRepo.save(newData);
    }


    async createMail(data: CreateMailDto): Promise<Mails> {
        const m = new Mails();
        m.id = uuid.v1();
        m.name = data.name;
        m.address = data.address;
        await this.mailRepo.save(m);
        this.logger.log(`createmail {${m.id.substring(0, 8)}, ${m.address}}`);
        return m;
    }
    async getAllMails(): Promise<Mails[]> {
        const ms = await this.mailRepo.find() || [];
        return ms;
    }

    async delMail(data: DelMailDto): Promise<Mails> {
        const f = await this.mailRepo.findOne({ id: data.id });
        if (f == null) {
            throw new Error(`mail(${data.id}) not exists!`);
        }
        await this.mailRepo.delete(f);
        this.logger.log(`delDelegate {${f.id.substring(0, 8)}, ${f.name.substring(0, 8)}}`)
        return f;
    }
    async getMailByAdress(address: string): Promise<Mails> {
        const f = await this.delegateRepo.findOne({ address });
        if (f == null) {
            throw new Error(`mail(${f.address}) not exists!`);
        }

        return f;
    }
}
