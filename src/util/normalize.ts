export function normalizeEvent(provider: string, payload: any): any {
  switch (provider) {
    case "stripe":
      return {
        provider: "stripe",
        id: payload.id,
        type: payload.type,
        created: payload.created,
        data: payload.data?.object ?? {},
      };
    case "razorpay":
      return {
        provider: "razorpay",
        id:
          payload?.payload?.payment?.entity?.id ||
          payload?.payload?.order?.entity?.id ||
          "",
        event: payload.event,
        created_at: payload.created_at,
        data: payload.payload ?? {},
      };
    default:
      throw new Error(`Unsupported provider for normalization: ${provider}`);
  }
}
