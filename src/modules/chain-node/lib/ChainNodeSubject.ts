import { ChainNodeObserver } from "./ChainNodeObserver";

export interface ChainNodeSubject {
    attackObserver(observer: ChainNodeObserver): Promise<boolean>;

    hasObserver(observer: ChainNodeObserver): Promise<boolean>;

    detachObserver(observer: ChainNodeObserver): Promise<boolean>;

    addDelegate(delegate: string): Promise<boolean>;

    hasDelegate(delegate: string): Promise<boolean>;

    removeDelegate(delegate: string): Promise<boolean>;
}