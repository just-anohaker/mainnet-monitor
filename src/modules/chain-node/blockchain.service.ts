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
import { delay } from '../../common';

@Injectable()
export class BlockChainService {
    private static MAX_TIMEOUT: number = 30 * 1000;

    async getHeight(server: BlockChainServer): Promise<Maybe<number>> {
        const url = this.buildBaseURL(server) + '/api/blocks/getHeight';

        const maybeHeight = await this.asyncGet(url);
        return maybeHeight ? maybeHeight.height : undefined;
    }

    async getBlock(
        server: BlockChainServer, height: number
    ): Promise<Maybe<BlockChainBlock>> {
        const url = this.buildBaseURL(server) + '/api/blocks/get';

        const maybeBlock = await this.asyncGet(url, { height });
        return maybeBlock ? this.buildBlockChainBlock(maybeBlock.block) : undefined;
    }

    async getBlocks(
        server: BlockChainServer, height: number, count: number
    ) {
        const url = this.buildBaseURL(server) + '/api/blocks';
        const maybeBlocks = await this.asyncGet(
            url,
            { offset: height, limit: count },
            BlockChainService.MAX_TIMEOUT
        );
        return maybeBlocks ? this.buildBlockChainBlocks(maybeBlocks.blocks) : undefined;
    }

    async getStatus(server: BlockChainServer): Promise<BlockChainStatus> {
        const url = this.buildBaseURL(server) + '/api/loader/status/sync';
        const MAX_COUNT = 10;
        let count = 0;
        let result: BlockChainStatus;
        while (true) {
            const maybeStatus = await this.asyncGet(url);
            if (maybeStatus != null || count >= MAX_COUNT) {
                result = maybeStatus
                    ? this.buildBlockChainStatus(maybeStatus)
                    : { status: -1 };
                break;
            }
            count++;
            await delay(300);
        }
        return result;
    }

    async getLastGeneratedBock(
        server: BlockChainServer, publicKey: string
    ): Promise<Maybe<BlockChainBlock>> {
        const url = this.buildBaseURL(server) + '/api/blocks';
        const maybeGeneratedBlocks = await this.asyncGet(
            url,
            {
                generatorPublicKey: publicKey,
                limit: 1,
                orderBy: 'height:desc'
            },
            BlockChainService.MAX_TIMEOUT
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

    private buildBlockChainBlocks(blocks: JsonObject[]): BlockChainBlock[] {
        const result: BlockChainBlock[] = [];
        for (const block of blocks) {
            result.push(this.buildBlockChainBlock(block));
        }

        return result;
    }

    private buildBlockChainStatus(status: JsonObject): BlockChainStatus {
        const result: BlockChainStatus = {
            status: status.syncing ? 1 : 0
        };

        return result;
    }

    private async asyncGet(
        url: string, params: JsonObject = {}, timeout: number = 4000
    ): Promise<Maybe<JsonObject>> {
        try {
            const resp = await axios.get(url, { params, timeout });
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