export interface Nameable {
    name: string;
}

export interface Serverable {
    ip: string;
    port: number;
}

export interface Idable {
    id: string;
}

export interface Blockable {
    blockId: string;
    blockHeight: number;
    blockTimestamp: number;
    blockDate: number;
}

export interface Generatorable {
    generatorPublicKey: string;
    generatorAddress: string;
}

export type NodeHeader = Serverable
    & Partial<Nameable>
    & { type?: number; };

export type DelegateHeader = Partial<Nameable>
    & { publicKey: string; };

export type NodeDetail = Idable
    & Serverable
    & Nameable
    & Blockable
    & Generatorable
    & {
        status: number;
        type: number;
        lastestHeight: number;
        delegates: DelegateDetail[];
    };

export type DelegateDetail = Nameable
    & Idable
    & Blockable
    & {
        publicKey: string;
        address?: string;
    };

export interface BlockHeader {
    id: string;
    height: number;
    generatorPublicKey: string;
    generatorId: string;
    timestamp: number;
}