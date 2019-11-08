import { Controller, Get, UseGuards, Req, Query, Post, Body } from '@nestjs/common';
import { ChainNodeService } from './chainnode.service';

import { NodeHeader, DelegateHeader, Idable } from "./types";
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
        try {
            const delNodeInfo = await this.chainnodeService.delChainNode(id);

            return buildResponseSuccess(delNodeInfo);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get('all')
    async allNodes() {
        try {
            const allNodesInfo = await this.chainnodeService.allNodes();

            return buildResponseSuccess(allNodesInfo);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get('detail/all')
    async allNodesDetails() {
        try {
            const allNodeDetails = await this.chainnodeService.allNodeDetails();

            return buildResponseSuccess(allNodeDetails);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Post('delegate')
    async addDelegate(@Body() delegateRelatived: DelegateHeader & Idable) {
        // TODO: validate id

        try {
            const publicKey = await this.chainnodeService.addDelegate(delegateRelatived);

            return buildResponseSuccess({ publicKey });
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get('delegate')
    async getDelegate(@Query('publicKey') publicKey: string) {
        //TODO: validate address

        try {
            const delegateInfo = await this.chainnodeService.getDelegate(publicKey);

            return buildResponseSuccess(delegateInfo);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Post('delegate/del')
    async delDelegate(@Body() { publicKey }: { publicKey: string }) {
        // TODO: validate address

        try {
            const delegateInfo = await this.chainnodeService.delDelegate(publicKey);

            return buildResponseSuccess(delegateInfo);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }

    @Get('delegate/all')
    async allDelegates() {
        try {
            const allDelegates = await this.chainnodeService.allDelegates();

            return buildResponseSuccess(allDelegates);
        } catch (error) {

            return buildResponseFailure(error.toString());
        }
    }
}