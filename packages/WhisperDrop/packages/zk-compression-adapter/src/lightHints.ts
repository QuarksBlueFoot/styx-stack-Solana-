/**
 * Hints for Light Protocol users.
 *
 * We do not import Light SDKs here to keep this package minimal and vendor-neutral.
 * Instead, apps can implement CompressedStateProvider using their preferred Light components
 * (indexer, RPC endpoints, etc.).
 */

export const LIGHT_PROTOCOL_HINTS = {
  docs: "Use your Light Protocol indexer/RPC integration to implement CompressedStateProvider.",
  reason: "Styx stays composable: compressed state is optional, and providers are pluggable.",
};
