import { DelegateDto } from './delegate.dto';

export class CreateNodeDto {
    ip: string;
    port: number;
    name: string;
    type: number;
}

export class DelNodeDto {
    id: string;
}

export class NodeDto {
    id: string;
    ip: string;
    port: number;
    name: string;
    type: number;
    status: number;
    lastestHeight: number;
    blockId: string;
    blockHeight: number;
    blockTimestamp: number;
    blockDate: number;
    generatorPublicKey: string;
    generatorAddress: string;
    delegates: DelegateDto[];
}