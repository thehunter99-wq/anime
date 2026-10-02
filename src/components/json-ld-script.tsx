interface JsonLdProps {
  /** Any schema.org node or array of nodes. */
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Injects a schema.org JSON-LD block.
 *
 * `<` is escaped to `<` so a title or description containing markup can never
 * break out of the script tag and inject script into the page. JSON.stringify
 * output is otherwise valid and must not be HTML-escaped — escaping `&` would
 * corrupt URLs inside the payload.
 */
export default function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // The payload is JSON.stringify output built entirely from typed props,
      // never from raw user HTML.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}