export interface BlockChainServer {
    readonly ip: string;
    readonly port: number;
}

export interface BlockChainBlock {
    readonly id: string;
    readonly height: number;
    readonly timestamp: number;
    readonly generatorPublicKey: string;
    readonly generatorId: string;
}

export const EMPTY_BLOCK: BlockChainBlock = {
    id: null,
    height: null,
    timestamp: null,
    generatorPublicKey: null,
    generatorId: null
}

export interface BlockChainStatus {
    readonly syncing: boolean;
}