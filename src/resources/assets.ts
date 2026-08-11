import type { APIClient } from '../lib/api.js';
import type { AssetCatalogResponse, RequestOptions } from '../types/index.js';

export class Assets {
  constructor(private readonly client: APIClient) {}

  /** List V2-supported assets and their network capabilities. */
  list(options?: RequestOptions): Promise<AssetCatalogResponse> {
    return this.client.get<AssetCatalogResponse>('/assets', undefined, options);
  }
}
