import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

import { ChainNode } from './modules/chain-node/models/node.entity';
import { Delegate } from './modules/chain-node/models/delegate.entity';

import ChainNodeModule from './modules/chain-node';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'sqlite',
            database: 'data.db',
            entities: [ChainNode, Delegate],
            synchronize: true
        }),
        ChainNodeModule
    ],
})
export class AppModule {
    constructor(private readonly connection: Connection) { }
}
