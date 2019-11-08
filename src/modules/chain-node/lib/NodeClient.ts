import axios from 'axios';
import { JsonObject } from '../types';

export class NodeClient {
    async get(url: string, params: JsonObject = {}): Promise<JsonObject> {
        const resp = await axios.get(url, { params });
        if (resp.status !== 200) {
            throw new Error(resp.statusText);
        }

        const { success, error } = resp.data;
        if (!success) {
            throw new Error(error);
        }

        const result = Object.assign(resp.data);
        delete result.success;

        return result;
    }
}