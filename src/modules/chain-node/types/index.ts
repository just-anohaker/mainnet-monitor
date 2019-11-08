export enum NodeType {
    GPU = 'gpu',
    SEED = 'seed',
    WALLET = 'wallet',
    UNDEFINED = 'undefined'
}

export function nodetypeToNumber(nodetype: NodeType): number {
    switch (nodetype) {
        case NodeType.GPU: return 0;
        case NodeType.SEED: return 1;
        case NodeType.WALLET: return 2;

        default: return -1;
    }
}

export function numberToNodeType(type: number): NodeType {
    switch (type) {
        case 0: return NodeType.GPU;
        case 1: return NodeType.SEED;
        case 2: return NodeType.WALLET;

        default: return NodeType.UNDEFINED;
    }
}

export interface NodeHeader {
    ip: string;
    port: number;
    type?: NodeType;
}

export interface DelegateHeader {
    name: string;
    publicKey: string;
}

export interface DelegateHeaderRelatived extends DelegateHeader {
    id: string;
}

export interface NodeInfo extends NodeHeader {
    id: string;

    lastestHeight?: number;
    generatorPublicKey?: string;
    generatorAddress?: string;
    blockId?: string;
    blockHeight?: number;
    blockTimestamp?: number;
    blockDate?: number;

    delegates?: DelegateInfo[];
}

export interface DelegateInfo extends DelegateHeader {
    nodeId: string;

    address?: string;
    blockId?: string;
    blockHeight?: number;
    blockTimestamp?: number;
    blockDate?: number;
}

export interface BlockHeader {
    id: string;
    generatorPublicKey: string;
    generatorAddress: string;
    height: number;
    timestamp: number;
}

export type JsonObject = {
    [key: string]: any;
}

export type BlockHeightResponse = {
    height: number;
}