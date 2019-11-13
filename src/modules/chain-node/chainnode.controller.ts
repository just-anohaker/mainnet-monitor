import { Controller, Get, Query, Post, Body, Logger } from '@nestjs/common';
import { ChainNodeService } from './chainnode.service';
import { ChainNodeEntityService } from './entity.service';
import { ChainNodeIOService } from './socketio.service';

import { CreateNodeDto, DelNodeDto } from './dto/node.dto';
import { CreateDelegateDto, DelDelegateDto } from './dto/delegate.dto';
import { buildResponseFailure, buildResponseSuccess } from "../../common";

@Controller('api/chain')
export class ChainNodeController {
    private logger: Logger = new Logger('ChainNodeController');
    constructor(
        private readonly chainnodeService: ChainNodeService,
        private readonly entityService: ChainNodeEntityService,
        private readonly ioService: ChainNodeIOService
    ) { }

    @Post()
    async addNode(@Body() body: CreateNodeDto) {
        this.logger.log(`addNode {${JSON.stringify(body)}}`);
        // TODO: validate node
        try {
            const newNode = await this.entityService.addNode(body);
            await this.chainnodeService.addNode(newNode);

            await this.ioService.emitNodeAdded(newNode.id);
            return buildResponseSuccess({ id: newNode.id });
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get()
    async getNode(@Query('id') id: string, @Query('withDelegates') withDelegates: boolean) {
        this.logger.log(`getNode {${id}, ${withDelegates}}`);
        // TODO: validate id
        try {
            const fNode = await this.entityService.getNodeById(id) as any;
            if (withDelegates) {
                const fDelegates = await this.entityService.getDelegatesByNodeId(id);
                fNode.delegates = fDelegates;
            }

            return buildResponseSuccess(fNode);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Post('del')
    async delNode(@Body() body: DelNodeDto) {
        this.logger.log(`delNode {${JSON.stringify(body)}}`);
        // TODO: validate id
        try {

            const delNode = await this.entityService.delNode(body);
            await this.chainnodeService.delNode(delNode);

            await this.ioService.emitNodeRemoved(delNode.id);
            // TODO
            return buildResponseSuccess(delNode);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get('all')
    async allNodes(@Query('withDelegates') withDelegates: boolean) {
        this.logger.log(`allNodes {${withDelegates}}`);
        // TODO: validate withDelegate
        try {
            const fNodes = await this.entityService.getAllNodes();
            if (withDelegates) {
                for (let i = 0; i < fNodes.length; i++) {
                    const node = fNodes[i];
                    const fDelegates = await this.entityService.getDelegatesByNodeId(node.id);
                    (node as any).delegates = fDelegates;
                }
            }

            return buildResponseSuccess(fNodes);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Post('delegate')
    async addDelegate(@Body() body: CreateDelegateDto) {
        this.logger.log(`addDelegate {${JSON.stringify(body)}}`);
        // TODO: validate id
        try {
            const newDelegate = await this.entityService.createDelegate(body);
            await this.chainnodeService.addDelegate(newDelegate);

            await this.ioService.emitDelegateAdded(newDelegate.publicKey);
            return buildResponseSuccess({ publicKey: newDelegate.publicKey });
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get('delegate')
    async getDelegate(@Query('publicKey') publicKey: string) {
        this.logger.log(`getDelegate {${publicKey}}`);
        //TODO: validate address
        try {
            const fDelegate = await this.entityService.getDelegateByPublicKey(publicKey);

            return buildResponseSuccess(fDelegate);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Post('delegate/del')
    async delDelegate(@Body() body: DelDelegateDto) {
        this.logger.log(`delDelegate {${JSON.stringify(body)}}`);
        // TODO: validate address
        try {
            const dDelegate = await this.entityService.delDelegate(body);
            await this.chainnodeService.delDelegate(dDelegate);

            await this.ioService.emitDelegateRemoved(dDelegate.publicKey);
            return buildResponseSuccess(dDelegate);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get('delegate/all')
    async allDelegates() {
        this.logger.log('allDelegates');
        try {
            const fDelegates = await this.entityService.getAllDelegates();

            return buildResponseSuccess(fDelegates);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }
}