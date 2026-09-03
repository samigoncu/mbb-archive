import { Fragment } from "react";

const markPattern = /<mark>(.*?)<\/mark>/gs;

/**
 * OpenSearch highlight parçaları `<mark>` etiketi içerir. Parça metni belge
 * içeriğinden geldiği için HTML olarak enjekte edilmez; etiketler ayrıştırılıp
 * React düğümü olarak render edilir.
 */
export function HighlightedText({ fragment }: { fragment: string }) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  markPattern.lastIndex = 0;

  while ((match = markPattern.exec(fragment)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(fragment.slice(lastIndex, match.index));
    }

    nodes.push(
      <mark
        key={`${match.index}-${match[1]}`}
        className="rounded-sm bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-500/40 dark:text-foreground"
      >
        {match[1]}
      </mark>,
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < fragment.length) {
    nodes.push(fragment.slice(lastIndex));
  }

  return (
    <>
      {nodes.map((node, index) => (
        <Fragment key={index}>{node}</Fragment>
      ))}
    </>
  );
}
