import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainNodeController } from './chainnode.controller';
import { ChainNodeService } from './chainnode.service';
import { ChainNodeIOService } from './socketio.service';
import { ChainNodeEntityService } from './entity.service';
import { BlockChainService } from './blockchain.service';
import { MailService } from './mail.service';
import { ChainNode } from './models/node.entity';
import { Delegate } from './models/delegate.entity';
import { Mails } from './models/mail.entity';
@Module({
    imports: [
        TypeOrmModule.forFeature([ChainNode, Delegate,Mails])
    ],
    controllers: [ChainNodeController],
    providers: [
        ChainNodeService,
        ChainNodeIOService,
        ChainNodeEntityService,
        BlockChainService,
        MailService
    ],
    // exports: [TypeOrmModule]
})
export class ChainNodeModule { }