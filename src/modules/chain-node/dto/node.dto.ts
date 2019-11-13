export class CreateNodeDto {
    ip: string;
    port: number;
    name: string;
    type: number;
}

export class DelNodeDto {
    id: string;
}