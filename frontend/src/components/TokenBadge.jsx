// Small label showing how many tokens one AI call used.
// Tokens are what hosted models bill for, so it is useful to see them.
export default function TokenBadge({ usage }) {
  if (!usage) return null;
  return (
    <span className="badge" title="Tokens used by this call">
      prompt {usage.promptTokens} · answer {usage.completionTokens} · total {usage.totalTokens}
    </span>
  );
}
