import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'mails' })
export class Mails {
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    address: string;

}