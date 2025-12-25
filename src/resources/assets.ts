import type { APIClient } from '../lib/api.js';
import type { AssetListResponse } from '../types/index.js';

export class Assets {
  constructor(private readonly client: APIClient) {}

  async list(): Promise<AssetListResponse> {
    return this.client.get<AssetListResponse>('/assets');
  }
}
