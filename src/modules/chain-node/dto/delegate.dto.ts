export class CreateDelegateDto {
    id: string;
    publicKey: string;
    name: string;
}

export class DelDelegateDto {
    publicKey: string;
    nodeId: string;
}

export class DelegateDto {
    id: string;
    name: string;
    publicKey: string;
    address: string;
    blockId: string;
    blockHeight: number;
    blockTimestamp: number;
    blockDate: number;
}
