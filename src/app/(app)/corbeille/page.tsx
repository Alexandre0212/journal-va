import { TrashBoard } from "@/features/trash-board";
import { loadTrash } from "@/server/queries";

export default async function TrashPage() {
  const rows = await loadTrash();
  return <TrashBoard rows={rows} />;
}
