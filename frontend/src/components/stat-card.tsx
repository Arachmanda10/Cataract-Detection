export function StatCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded border p-4">
      <span className="text-sm text-gray-600">{title}</span>
      <span className="text-2xl font-semibold">{value}</span>
      {note && <span className="text-xs text-gray-500">{note}</span>}
    </div>
  );
}