import { Injectable, Logger } from '@nestjs/common';
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
import { NodeDetail, DelegateDetail } from './types';

@WebSocketGateway()
export class ChainNodeIOService {
    @WebSocketServer()
    private server: Server

    constructor() { }

    async emitHeightUpdate(data: NodeDetail) {
        this.server.emit(EVT_HEIGHT_UPDATE, data);
    }

    async emitNodeUpdate(data: NodeDetail) {
        this.server.emit(EVT_NODE_UPDATE, data);
    }

    async emitDelegateUpdate(data: DelegateDetail) {
        this.server.emit(EVT_DELEGATE_UPDATE, data);
    }

    async emitStatusUpdate(data: NodeDetail) {
        this.server.emit(EVT_STATUS_UPDATE, data);
    }

    async emitNodeAdded(nodeId: string) {
        this.server.emit(EVT_NODE_ADDED, nodeId);
    }

    async emitNodeRemoved(nodeId: string) {
        this.server.emit(EVT_NODE_REMOVED, nodeId);
    }

    async emitDelegateAdded(publicKey: string) {
        this.server.emit(EVT_DELEGATE_ADDED, publicKey);
    }

    async emitDelegateRemoved(publicKey: string) {
        this.server.emit(EVT_DELEGATE_REMOVED, publicKey);
    }
}
