import { Connection, PublicKey } from "@solana/web3.js";
import { createStyxContext } from "@styx/styx-context";
import { styxMessagingDefaults, styxMobileDefaults } from "@styx/presets";
import { SecureStorageInboxStore } from "@styx/inbox-store";
import { SecureStorageOutboxStore } from "@styx/mobile-outbox";

/**
 * Drop-in Styx wiring for RN apps.
 *
 * - You provide the wallet `owner` pubkey and a decryptFn (keys remain yours).
 * - Styx stores are local-first (encrypted at rest) and optional.
 */
export function createDefaultStyx(connection: Connection, owner: PublicKey) {
  const inboxStore = new SecureStorageInboxStore();
  const outboxStore = new SecureStorageOutboxStore();

  return createStyxContext({
    connection,
    owner,
    inboxStore,
    outboxStore,
    preferRail: styxMessagingDefaults.preferRail,
    priority: styxMessagingDefaults.priority,
    memoMaxChars: styxMessagingDefaults.memoMaxChars,
    mobile: {
      ...styxMobileDefaults,
    },
  });
}
