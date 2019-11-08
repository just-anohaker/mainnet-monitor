export function buildResponseSuccess(data: any) {
    return {
        success: true,
        data: data
    };
}

export function buildResponseFailure(error: string) {
    return {
        success: false,
        error: error
    };
}

export const EVT_HEIGHT_UPDATE = 'height/update';
export const EVT_NODE_UPDATE = 'node/update';
export const EVT_DELEGATE_UPDATE = 'delegate/update';