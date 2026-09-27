"use client";

import { VaultProvider } from "@/lib/vault";
import { VaultGate } from "@/components/VaultGate";
import { Shell } from "@/components/Shell";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <VaultProvider>
      <VaultGate>
        <Shell>{children}</Shell>
      </VaultGate>
    </VaultProvider>
  );
}
