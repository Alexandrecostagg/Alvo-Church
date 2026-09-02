"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Layers } from "lucide-react";
import { useAppAuth } from "../../app/providers";
import { isPlatformAdmin } from "@alvo/firebase";
import type { Organization } from "@alvo/types";

export function OrgSwitcher() {
  const {
    user,
    organizationId,
    tenantRuntime,
    firebaseConfig,
    switchOrganization,
  } = useAppAuth();

  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  // Trocar de organização livremente só faz sentido para quem enxerga TODAS
  // elas — isto é, o admin da plataforma, não um "super_admin" de tenant
  // (que é só o topo da hierarquia dentro de uma única igreja).
  const [canSwitch, setCanSwitch] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setCanSwitch(false);
      return;
    }
    let active = true;
    isPlatformAdmin(firebaseConfig, user.uid).then((ok) => {
      if (active) setCanSwitch(ok);
    });
    return () => {
      active = false;
    };
  }, [user, firebaseConfig]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !canSwitch || orgs.length > 0) return;
    setLoading(true);
    import("@alvo/firebase").then(async (sdk) => {
      try {
        const list = await sdk.fetchAllOrganizations(firebaseConfig);
        setOrgs(
          list.sort((a, b) =>
            (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
          ),
        );
      } finally {
        setLoading(false);
      }
    });
  }, [open, canSwitch, orgs.length, firebaseConfig]);

  if (!canSwitch) return null;

  const activeLabel =
    tenantRuntime?.organization?.displayName ??
    tenantRuntime?.organization?.name ??
    organizationId;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: 13,
          color: "var(--color-text-primary)",
        }}
      >
        <Layers size={14} color="#534AB7" />
        <span
          style={{
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {activeLabel}
        </span>
        <ChevronDown size={13} color="var(--color-text-secondary)" />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
            zIndex: 100,
            minWidth: 280,
            maxHeight: 360,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "0.5px solid var(--color-border-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Building2 size={14} color="#534AB7" />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}
            >
              Trocar organização
            </span>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div className="spinner" style={{ margin: "0 auto" }} />
              </div>
            ) : orgs.length === 0 ? (
              <p
                style={{
                  padding: 16,
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  textAlign: "center",
                }}
              >
                Nenhuma organização encontrada.
              </p>
            ) : (
              orgs.map((org) => {
                const isActive = org.id === organizationId;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: isActive
                        ? "var(--color-background-secondary)"
                        : "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      borderBottom: "0.5px solid var(--color-border-tertiary)",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        flexShrink: 0,
                        background: isActive
                          ? "#EEEDFE"
                          : "var(--color-background-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 500,
                        color: isActive
                          ? "#534AB7"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      {(org.displayName ?? org.name).slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          margin: "0 0 2px",
                          color: isActive
                            ? "#534AB7"
                            : "var(--color-text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {org.displayName ?? org.name}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-secondary)",
                          margin: 0,
                        }}
                      >
                        {org.organizationTier ??
                          org.organizationType ??
                          "church"}
                      </p>
                    </div>
                    {isActive && <Check size={14} color="#534AB7" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
