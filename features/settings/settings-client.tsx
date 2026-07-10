"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CreditCardIcon, DownloadIcon, GiftIcon, TrashIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { useToast } from "@/hooks/use-toast";

interface SettingsClientProps {
  userId: string;
}

export function SettingsClient({ userId }: SettingsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleExportData() {
    setIsExporting(true);
    try {
      const res = await fetch("/api/settings/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `scouting-report-data-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast({ description: "Data exported successfully" });
      }
    } catch {
      toast({ description: "Failed to export data", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/settings/account", { method: "DELETE" });
      if (res.ok) {
        router.push("/");
      }
    } catch {
      toast({ description: "Failed to delete account", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/payments"
        className="bg-card border-border hover:border-tertiary/30 block rounded-xl border p-6 transition-colors">
        <div className="flex items-center gap-4">
          <div className="bg-tertiary/10 rounded-lg p-3">
            <CreditCardIcon className="text-tertiary h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-semibold">Buy credits</p>
            <p className="font-display text-muted-foreground text-xs">
              Add more credits to your account
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/referrals"
        className="bg-card border-border hover:border-tertiary/30 block rounded-xl border p-6 transition-colors">
        <div className="flex items-center gap-4">
          <div className="bg-tertiary/10 rounded-lg p-3">
            <GiftIcon className="text-tertiary h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-semibold">Refer a friend</p>
            <p className="font-display text-muted-foreground text-xs">
              Invite friends and earn bonus credits
            </p>
          </div>
        </div>
      </Link>

      <button
        onClick={handleExportData}
        disabled={isExporting}
        className="bg-card border-border hover:border-tertiary/30 w-full rounded-xl border p-6 text-left transition-colors disabled:opacity-50">
        <div className="flex items-center gap-4">
          <div className="bg-tertiary/10 rounded-lg p-3">
            <DownloadIcon className="text-tertiary h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-semibold">
              {isExporting ? "Exporting..." : "Export my data"}
            </p>
            <p className="font-display text-muted-foreground text-xs">
              Download all your data as JSON
            </p>
          </div>
        </div>
      </button>

      <div className="border-destructive/20 bg-destructive/5 rounded-xl border p-6">
        <div className="flex items-center gap-4">
          <div className="bg-destructive/10 rounded-lg p-3">
            <TrashIcon className="text-destructive h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-display text-destructive text-sm font-semibold">Delete account</p>
            <p className="font-display text-muted-foreground text-xs">
              Permanently delete your account and data
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger>
              <Button
                variant="outline"
                className="font-display border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                size="sm">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="font-display">
                  This action cannot be undone. This will permanently delete your account, all your
                  research data, and credits. This process is irreversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-display">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="font-display bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
