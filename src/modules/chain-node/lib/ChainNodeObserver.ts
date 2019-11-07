import { NodeHeader, BlockHeader } from "../types";

export interface ChainNodeObserver {
    onNodeChanged(node: NodeHeader, block: BlockHeader): Promise<void>;

    onDelegateChanged(delegate: string, block: BlockHeader): Promise<void>;
}