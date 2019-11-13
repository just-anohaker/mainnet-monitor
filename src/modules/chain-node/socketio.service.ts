import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

import {
    EVT_HEIGHT_UPDATE,
    EVT_NODE_UPDATE,
    EVT_DELEGATE_UPDATE,
    EVT_STATUS_UPDATE,

    EVT_NODE_ADDED,
    EVT_NODE_REMOVED,

    EVT_DELEGATE_ADDED,
    EVT_DELEGATE_REMOVED
} from '../../app.constants';
import { NodeDto } from './dto/node.dto';
import { DelegateDto } from './dto/delegate.dto';

@WebSocketGateway()
export class ChainNodeIOService {
    @WebSocketServer()
    private server: Server

    private logger: Logger = new Logger('ChainNodeIOService', true)

    constructor() { }

    async emitHeightUpdate(data: NodeDto) {
        this.logger.log(`emitHeightUpdate {${data.id.substring(0, 8)}, ${data.lastestHeight}}`);

        this.server.emit(EVT_HEIGHT_UPDATE, data);
    }

    async emitNodeUpdate(data: NodeDto) {
        this.logger.log(`emitNodeUpdate {${data.id.substring(0, 8)}, ${data.blockHeight}, ${data.generatorAddress}}`);

        this.server.emit(EVT_NODE_UPDATE, data);
    }

    async emitDelegateUpdate(data: DelegateDto) {
        this.logger.log(`emitDelegateUpdate {${data.id.substring(0, 8)}, ${data.blockHeight}, ${data.address}}`);

        this.server.emit(EVT_DELEGATE_UPDATE, data);
    }

    async emitStatusUpdate(data: NodeDto) {
        this.logger.log(`emitStatusUpdate {${data.id.substring(0, 8)}, ${data.status}}`);

        this.server.emit(EVT_STATUS_UPDATE, data);
    }

    async emitNodeAdded(nodeId: string) {
        this.logger.log(`emitNodeAdded {${nodeId}}`);

        this.server.emit(EVT_NODE_ADDED, nodeId);
    }

    async emitNodeRemoved(nodeId: string) {
        this.logger.log(`emitNodeRemoved {${nodeId}}`);

        this.server.emit(EVT_NODE_REMOVED, nodeId);
    }

    async emitDelegateAdded(publicKey: string) {
        this.logger.log(`emitDelegateAdded {${publicKey}}`);

        this.server.emit(EVT_DELEGATE_ADDED, publicKey);
    }

    async emitDelegateRemoved(publicKey: string) {
        this.logger.log(`emitDelegateRemoved {${publicKey}}`);

        this.server.emit(EVT_DELEGATE_REMOVED, publicKey);
    }
}
