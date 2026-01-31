export type EpochId = string;

export type AE1 = {
  v: "ae1";
  ciphertext_b64: string;
  tag?: string;
  createdAt: number;
};

export type RC1 = {
  v: "rc1";
  action_hash_b64: string;
  epoch_id: EpochId;
  index: number;
  proof?: string[];
};

export type EC1 = {
  v: "ec1";
  epoch_id: EpochId;
  epoch_root_b64: string;
  state_root_b64?: string;
  nullifier_root_b64?: string;
  policy_id: string;
  createdAt: number;
};

export interface EphemeralRollupOperatorClient {
  submitAction(envelope: AE1): Promise<{ receipt: RC1 }>;
  getEpochCommitment(epochId: EpochId): Promise<EC1 | null>;
}
