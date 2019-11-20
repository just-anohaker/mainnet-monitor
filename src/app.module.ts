import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { HandlebarsAdapter, MailerModule } from '@nest-modules/mailer';
import { ChainNode } from './modules/chain-node/models/node.entity';
import { Delegate } from './modules/chain-node/models/delegate.entity';
import { Mails } from './modules/chain-node/models/mail.entity';
import ChainNodeModule from './modules/chain-node';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'sqlite',
            database: 'app.db',
            entities: [ChainNode, Delegate,Mails],
            synchronize: true
        }),
        ChainNodeModule,
        MailerModule.forRoot({
            transport: 'smtps://bibi_ever@qq.com:pmkdezkctnazbfec@smtp.qq.com',
            defaults: {
              from:'"ETM Foundation"',
            },
            template: {
              dir: __dirname + '/templates',
              adapter: new HandlebarsAdapter(), // or new PugAdapter()
              options: {
                strict: true,
              },
            },
          })
    ],
})
export class AppModule {
    constructor(private readonly connection: Connection) { }
}
