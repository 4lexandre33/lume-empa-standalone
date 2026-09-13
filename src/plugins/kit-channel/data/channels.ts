/**
 * Channel kinds. Examples of data — not live until applyChannelKit.
 * No upstream “multilinear” repo; names from the E3 plan.
 */
export const CHANNEL_KINDS = ["economia", "politica", "facoes"] as const;

export type ChannelKind = (typeof CHANNEL_KINDS)[number];
