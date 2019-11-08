import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'chainnodes' })
export class ChainNode {
    @PrimaryColumn()
    id: string;

    @Column()
    ip: string;

    @Column()
    port: number;

    @Column({
        default: -1
    })
    type: number;

    @Column({ nullable: true })
    name: string;

    @Column({
        default: 0
    })
    status: number;

    @Column({ nullable: true })
    lastestHeight: number;

    @Column({ nullable: true })
    generatorPublicKey: string;

    @Column({ nullable: true })
    generatorAddress: string;

    @Column({ nullable: true })
    blockId: string;

    @Column({ nullable: true })
    blockHeight: number;

    @Column({ nullable: true })
    blockTimestamp: number;

    @Column({ nullable: true })
    blockDate: number;
}