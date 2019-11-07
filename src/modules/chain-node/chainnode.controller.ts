import { Controller, Get, UseGuards, Req, Query, Post, Body } from '@nestjs/common';
import { ChainNodeService } from './chainnode.service';

import { NodeHeader, DelegateHeaderRelatived } from "./types";
import { buildResponseFailure, buildResponseSuccess } from "../../common";

@Controller('api/chain')
export class ChainNodeController {
    constructor(
        private readonly chainnodeService: ChainNodeService
    ) { }

    @Post()
    async addNode(@Body() node: NodeHeader) {
        // TODO: validate node
        try {
            const nodeId = await this.chainnodeService.addChainNode(node);

            return buildResponseSuccess({ id: nodeId });
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get()
    async getNode(@Query('id') id: string) {
        // TODO: validate id
        try {
            const chainNodeInfo = await this.chainnodeService.getChainNode(id);

            return buildResponseSuccess(chainNodeInfo);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Post('del')
    async delNode(@Body() { id }: { id: string }) {
        // TODO: validate id
        console.log('delNode:', id);
        try {
            const delNodeInfo = await this.chainnodeService.delChainNode(id);

            return buildResponseSuccess(delNodeInfo);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Post('delegate')
    async addDelegate(@Body() delegateRelatived: DelegateHeaderRelatived) {
        // TODO: validate id

        try {
            const address = await this.chainnodeService.addDelegate(delegateRelatived);

            return buildResponseSuccess({ address });
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get('delegate')
    async getDelegate(@Query('address') address: string) {
        //TODO: validate address

        try {
            const delegateInfo = await this.chainnodeService.getDelegate(address);

            return buildResponseSuccess(delegateInfo);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Post('delegate/del')
    async delDelegate(@Body() { address }: { address: string }) {
        // TODO: validate address

        try {
            const delegateInfo = await this.chainnodeService.delDelegate(address);

            return buildResponseSuccess(delegateInfo);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }
}