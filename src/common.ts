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