"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus, ShieldCheck } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { assignTaskAction, getTaskAssignees } from "../api/assignment-actions";
import type { WorkflowWorkItem } from "../model/workflow";

export function TaskReassignDialog({
  item,
  documentTitle,
}: {
  item: WorkflowWorkItem;
  documentTitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<{ subjectId: string; unitName: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (open) {
      setLoading(true);
      setError("");
      getTaskAssignees(item.documentId, item.permission).then((result) => {
        if (active) {
          setCandidates(result.items || []);
          setError(result.error ?? "");
          setLoading(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [open, item.documentId, item.permission]);

  const hasAssignee = Boolean(item.assigneeSubjectId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-lg hover:bg-muted"
          />
        }
      >
        {hasAssignee ? (
          <>
            <UserCheck className="size-3.5" aria-hidden />
            <span>Yeniden ata</span>
          </>
        ) : (
          <>
            <UserPlus className="size-3.5" aria-hidden />
            <span>Personele ata</span>
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-2xl p-5 border border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <UserCheck className="size-4" aria-hidden />
            </span>
            <div>
              <DialogTitle className="text-base font-semibold">
                {hasAssignee ? "Görevi Başka Personele Ata" : "Görevi Personele Ata"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {item.nodeName || "İş akışı adımı"} · {item.definitionName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-3 space-y-3 text-xs">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1">
            {documentTitle && (
              <p className="text-muted-foreground">
                Belge: <span className="font-medium text-foreground">{documentTitle}</span>
              </p>
            )}
            <p className="text-muted-foreground">
              Mevcut Personel:{" "}
              <span className="font-semibold text-foreground">
                {item.assigneeSubjectId ?? "Atama bekliyor (boşta)"}
              </span>
            </p>
          </div>

          <ActionForm
            action={assignTaskAction}
            label={hasAssignee ? "Atamayı güncelle" : "Görevi personele ata"}
            submitClassName="mt-4 h-9.5 w-full rounded-xl text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all"
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
          >
            <input type="hidden" name="instanceId" value={item.instanceId} />
            <input type="hidden" name="workItemId" value={item.id} />
            <input type="hidden" name="version" value={item.version} />

            <div className="space-y-1">
              <label
                htmlFor={`reassign-subject-${item.id}`}
                className="text-xs font-semibold text-foreground"
              >
                Yeni Atanacak Personel
              </label>
              <select
                id={`reassign-subject-${item.id}`}
                name="subjectId"
                required
                disabled={loading || !candidates.length}
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="h-9.5 w-full rounded-xl border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="">
                  {loading
                    ? "Yetkili personel yükleniyor…"
                    : candidates.length === 0
                      ? "Atanabilecek yetkili personel bulunamadı"
                      : "Personel seçin..."}
                </option>
                {candidates.map((c) => (
                  <option key={c.subjectId} value={c.subjectId}>
                    {c.subjectId} · {c.unitName}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2 mt-1">
              <ShieldCheck className="size-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
              <span>
                Yalnızca ilgili belgenin birimindeki görev tamamlama yetkisine sahip personel listelenir.
              </span>
            </div>

            {error && (
              <p role="alert" className="text-xs text-destructive mt-1">
                {error}
              </p>
            )}
          </ActionForm>
        </div>
      </DialogContent>
    </Dialog>
  );
}

