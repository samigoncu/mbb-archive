type ArchitectureCardProps = {
  title: string;
  value: string;
  detail: string;
};

export function ArchitectureCard({
  title,
  value,
  detail,
}: ArchitectureCardProps) {
  return (
    <article className="card">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
