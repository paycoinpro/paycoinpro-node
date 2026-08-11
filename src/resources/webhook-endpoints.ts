import type { APIClient } from '../lib/api.js';
import type {
  CreateWebhookEndpointRequest,
  MutationOptions,
  RequestOptions,
  RotateWebhookSecretRequest,
  UpdateWebhookEndpointRequest,
  WebhookEndpointList,
  WebhookEndpointResource,
  WebhookRedeliveryAccepted,
} from '../types/index.js';

export class WebhookEndpoints {
  constructor(private readonly client: APIClient) {}

  /**
   * Create an endpoint. The response carries `secret` exactly once — persist it
   * immediately; it is not readable again.
   */
  create(
    params: CreateWebhookEndpointRequest,
    options: MutationOptions
  ): Promise<WebhookEndpointResource> {
    return this.client.post<WebhookEndpointResource>('/webhook-endpoints', params, options);
  }

  list(options?: RequestOptions): Promise<WebhookEndpointList> {
    return this.client.get<WebhookEndpointList>('/webhook-endpoints', undefined, options);
  }

  update(
    id: string,
    params: UpdateWebhookEndpointRequest,
    options: MutationOptions
  ): Promise<WebhookEndpointResource> {
    return this.client.patch<WebhookEndpointResource>(
      `/webhook-endpoints/${encodeURIComponent(id)}`,
      params,
      options
    );
  }

  /**
   * Rotate the signing secret. Both the old and the new secret sign deliveries
   * during the overlap window, so verification must accept either.
   */
  rotateSecret(
    id: string,
    params: RotateWebhookSecretRequest,
    options: MutationOptions
  ): Promise<WebhookEndpointResource> {
    return this.client.post<WebhookEndpointResource>(
      `/webhook-endpoints/${encodeURIComponent(id)}/rotate-secret`,
      params,
      options
    );
  }

  redeliverEvent(eventId: string, options: MutationOptions): Promise<WebhookRedeliveryAccepted> {
    return this.client.post<WebhookRedeliveryAccepted>(
      `/webhook-events/${encodeURIComponent(eventId)}/redeliver`,
      undefined,
      options
    );
  }
}
