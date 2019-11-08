import { NodeHeader, BlockHeader } from "../types";

export interface ChainNodeObserver {
    onNodeChanged(nodeId: string, node: NodeHeader, block: BlockHeader): Promise<void>;

    onDelegateChanged(nodeId: string, delegatePublicKey: string, block: BlockHeader): Promise<void>;
}