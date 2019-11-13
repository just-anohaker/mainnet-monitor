import { Injectable } from '@nestjs/common';
import axios from 'axios';

import {
    BlockChainServer,
    BlockChainBlock,
    BlockChainStatus
} from './interfaces/blockchain.interface';
import {
    Maybe,
    JsonObject
} from './interfaces/comon.interface';

@Injectable()
export class BlockChainService {
    async getHeight(server: BlockChainServer): Promise<Maybe<number>> {
        const url = this.buildBaseURL(server) + '/api/blocks/getHeight';

        const maybeHeight = await this.asyncGet(url);
        return maybeHeight ? maybeHeight.height : undefined;
    }

    async getBlock(server: BlockChainServer, height: number): Promise<BlockChainBlock> {
        const url = this.buildBaseURL(server) + '/api/blocks/get';

        const maybeBlock = await this.asyncGet(url, { height });
        return maybeBlock ? this.buildBlockChainBlock(maybeBlock.block) : undefined;
    }

    async getStatus(server: BlockChainServer): Promise<BlockChainStatus> {
        const url = this.buildBaseURL(server) + '/api/loader/status/sync';

        const maybeStatus = await this.asyncGet(url);
        return maybeStatus ? this.buildBlockChainStatus(maybeStatus) : undefined;

    }

    async getLastGeneratedBock(server: BlockChainServer, publicKey: string): Promise<Maybe<BlockChainBlock>> {
        const url = this.buildBaseURL(server) + '/api/blocks';
        const maybeGeneratedBlocks = await this.asyncGet(
            url,
            {
                generatorPublicKey: publicKey,
                limit: 1,
                orderBy: 'height:desc'
            }
        );
        if (maybeGeneratedBlocks == null) return undefined;
        const blocks = maybeGeneratedBlocks.blocks;
        if (blocks.length <= 0) return undefined;

        return this.buildBlockChainBlock(blocks[0]);
    }

    private buildBaseURL(server: BlockChainServer): string {
        return `http://${server.ip}:${server.port}`;
    }

    private buildBlockChainBlock(block: JsonObject): BlockChainBlock {
        const result: BlockChainBlock = {
            id: block.id,
            height: block.height,
            timestamp: block.timestamp,
            generatorPublicKey: block.generatorPublicKey,
            generatorId: block.generatorId
        };

        return result;
    }

    private buildBlockChainStatus(status: JsonObject): BlockChainStatus {
        const result: BlockChainStatus = {
            syncing: status.syncing
        };

        return result;
    }

    private async asyncGet(url: string, params: JsonObject = {}): Promise<Maybe<JsonObject>> {
        try {
            const resp = await axios.get(url, { params });
            if (resp.status !== 200) {
                throw new Error(resp.statusText);
            }
            const { success, error } = resp.data;
            if (!success) {
                throw new Error(error);
            }

            const result = Object.assign(resp.data);
            delete result.success;
            return result;
        } catch (error) {
            // TODO

            return undefined;
        }
    }
}