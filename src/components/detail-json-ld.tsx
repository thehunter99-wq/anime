import JsonLd from '@/components/json-ld-script';

type DetailJsonLdProps = {
  nodes: Array<Record<string, unknown> | null | undefined>;
};

/**
 * Emits one `application/ld+json` block containing every schema node for a detail
 * page, joined through an `@graph`.
 *
 * ── One script, not three ────────────────────────────────────────────────────
 * Separate scripts would each parse fine, but a single `@graph` is what Google's
 * documentation recommends: it lets the nodes reference each other, and one block
 * is cheaper for the crawler to parse than three. The optional nodes
 * (`VideoObject`, `aggregateRating`) are frequently absent for some titles, and
 * a graph simply omits them instead of shipping a half-empty script.
 *
 * Nodes that come back empty are dropped. `buildVideoObject` returns `{}` when
 * Google's mandatory properties are unavailable, and an empty JSON-LD node is
 * reported by the Rich Results Test as a syntax error, so the filter is load
 * bearing rather than cosmetic.
 */
export function DetailJsonLd({ nodes }: DetailJsonLdProps) {
  /**
   * The graph carries a single `@context`. Individual builders also stamp one on
   * their own node so they stay valid when used standalone, but repeating it per
   * node inside a graph is redundant, and a validator reading the outermost
   * value should not have to reconcile conflicting ones.
   */
  const graph = nodes
    .filter(
      (node): node is Record<string, unknown> =>
        !!node && Object.keys(node).length > 0
    )
    .map(({ '@context': _context, ...rest }) => rest);

  if (graph.length === 0) return null;

  return (
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': graph }} />
  );
}

export default DetailJsonLd;