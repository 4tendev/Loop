import AvalonTablesClient from "../AvalonTablesClient";

type AvalonTablePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AvalonTablePage({ params }: AvalonTablePageProps) {
  const { id } = await params;

  return <AvalonTablesClient tableId={id} />;
}
