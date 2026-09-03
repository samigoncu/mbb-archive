import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getFilePlans,
  getFilePlanTree,
  getMetadataSchemas,
} from "@/features/classification/api/get-classification";
import { FilePlanTreeView } from "@/features/classification/components/file-plan-tree";
import { schemaStatusLabels } from "@/features/classification/model/classification";
import { EmptyState, PageHeader, Panel } from "@/components/ui/page";

export const metadata = { title: "Tanımlamalar · MBB Kurumsal Arşiv" };

const dateOnly = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" });

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TanimlamalarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = Array.isArray(params.plan) ? params.plan[0] : params.plan;

  const [plans, schemas] = await Promise.all([getFilePlans(), getMetadataSchemas()]);
  const activePlanId = requested ?? plans[0]?.id;
  const tree = activePlanId ? await getFilePlanTree(activePlanId) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tanımlamalar"
        description="Standart dosya planı tasnif ağacı ve üstveri şemaları."
      />

      <Tabs defaultValue="file-plan">
        <TabsList>
          <TabsTrigger value="file-plan">Dosya Planı</TabsTrigger>
          <TabsTrigger value="schemas">Üstveri Şemaları</TabsTrigger>
        </TabsList>

        <TabsContent value="file-plan" className="mt-3 flex flex-col gap-3">
          {plans.length === 0 ? (
            <EmptyCard text="Henüz bir standart dosya planı tanımlanmamış." />
          ) : (
            <>
              <nav aria-label="Dosya planı seçimi" className="flex flex-wrap gap-2">
                {plans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/tanimlamalar?plan=${plan.id}`}
                    aria-current={plan.id === activePlanId ? "page" : undefined}
                    className={
                      plan.id === activePlanId
                        ? "rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                        : "rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                    }
                  >
                    <span className="font-mono text-xs">{plan.code}</span>
                    <span className="ml-2">{plan.name}</span>
                  </Link>
                ))}
              </nav>

              {tree ? (
                <>
                  <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                    <Meta label="Yürürlük Makamı">{tree.authority}</Meta>
                    <Meta label="Sürüm">{tree.version}</Meta>
                    <Meta label="Yürürlük Başlangıcı">
                      {dateOnly.format(new Date(tree.effectiveFrom))}
                    </Meta>
                    <Meta label="Düğüm Sayısı">{tree.items.length}</Meta>
                  </dl>
                  <FilePlanTreeView nodes={tree.items} />
                </>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="schemas" className="mt-3">
          {schemas.length === 0 ? (
            <EmptyCard text="Henüz üstveri şeması tanımlanmamış." />
          ) : (
            <Panel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Anahtar</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead className="w-20 text-right">Sürüm</TableHead>
                    <TableHead className="w-20 text-right">Alan</TableHead>
                    <TableHead className="w-32">Durum</TableHead>
                    <TableHead className="w-32">Yayın</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemas.map((schema) => (
                    <TableRow key={schema.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {schema.key}
                      </TableCell>
                      <TableCell className="font-medium">{schema.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {schema.version}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {schema.fieldCount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={schema.status === "Published" ? "success" : "outline"}
                        >
                          {schemaStatusLabels[schema.status] ?? schema.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {schema.publishedAt
                          ? dateOnly.format(new Date(schema.publishedAt))
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card p-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
