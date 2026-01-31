import type { EphemeralRollupOperatorClient, AE1, RC1, EC1 } from "./types";

export class HttpOperatorClient implements EphemeralRollupOperatorClient {
  constructor(private readonly baseUrl: string) {}

  async submitAction(envelope: AE1): Promise<{ receipt: RC1 }> {
    const res = await fetch(this.baseUrl + "/epr1/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
    });
    if (!res.ok) throw new Error(`operator submit failed (${res.status})`);
    return await res.json();
  }

  async getEpochCommitment(epochId: string): Promise<EC1 | null> {
    const res = await fetch(this.baseUrl + "/epr1/epoch/" + encodeURIComponent(epochId));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`operator epoch fetch failed (${res.status})`);
    return await res.json();
  }
}
