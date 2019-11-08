import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'delegates' })
export class Delegate {
    @PrimaryColumn()
    publicKey: string;

    @Column()
    nodeId: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    blockId: string;

    @Column({ nullable: true })
    blockHeight: number;

    @Column({ nullable: true })
    blockTimestamp: number;

    @Column({ nullable: true })
    blockDate: number;
}

