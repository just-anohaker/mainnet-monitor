import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainNodeController } from './chainnode.controller';
import { ChainNodeService } from './chainnode.service';

import { ChainNode } from './models/node.entity';
import { Delegate } from './models/delegate.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChainNode, Delegate])
    ],
    controllers: [ChainNodeController],
    providers: [ChainNodeService],
    // exports: [TypeOrmModule]
})
export class ChainNodeModule { }