"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  Store,
  Search,
  Plus,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  MessageCircle,
} from "lucide-react";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_STATUS,
  communityWhatsapp,
  communityMaps,
  safeCommunityUrl,
} from "@alvo/utils";
import { useAppAuth } from "../../../app/providers";
import styles from "./community-workspace.module.css";

const base = "/marketplace-community";
type Mode = "catalog" | "mine" | "moderation" | "new" | "edit" | "detail";
type RecordData = Record<string, any>;
const blank = {
  name: "",
  description: "",
  offerings: "",
  category: "community",
  whatsapp: "",
  email: "",
  phone: "",
  website: "",
  instagram: "",
  facebook: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
  postalCode: "",
  bannerImageUrl: "",
};
const statusName = (s: string) =>
  COMMUNITY_STATUS[s as keyof typeof COMMUNITY_STATUS] || s;
const categoryName = (s: string) =>
  COMMUNITY_CATEGORIES[s as keyof typeof COMMUNITY_CATEGORIES] || s;
const folded = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const dateLabel = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? s.split("-").reverse().join("/")
    : new Date(s).toLocaleDateString("pt-BR");

async function prepareBanner(file: File) {
  if (
    !/^image\/(jpeg|png|webp)$/.test(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw Error("Escolha JPEG, PNG ou WebP de até 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas"),
      scale = Math.min(1, 1000 / bitmap.width, 600 / bitmap.height);
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Não foi possível preparar a imagem.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5, 0.35]) {
      const result = canvas.toDataURL("image/jpeg", quality);
      if (result.length < 210000) return result;
    }
    throw Error(
      "A imagem ainda ficou grande. Escolha uma imagem mais simples.",
    );
  } finally {
    bitmap.close();
  }
}

export function CommunityWorkspace({
  mode,
  storeId,
}: {
  mode: Mode;
  storeId?: string;
}) {
  const { organizationId, user } = useAppAuth();
  return (
    <Workspace
      key={`${organizationId}:${user?.uid}:${mode}:${storeId || ""}`}
      mode={mode}
      storeId={storeId}
    />
  );
}
function Workspace({ mode, storeId }: { mode: Mode; storeId?: string }) {
  const { organizationId, user } = useAppAuth();
  const [rows, setRows] = useState<RecordData[]>([]),
    [detail, setDetail] = useState<RecordData | null>(null);
  const [staff, setStaff] = useState(false),
    [total, setTotal] = useState(0),
    [cursor, setCursor] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("");
  const [filter, setFilter] = useState(mode === "moderation" ? "pending" : ""),
    [revision, setRevision] = useState(0);
  const [form, setForm] = useState(blank),
    [savedId, setSavedId] = useState("");
  const [reason, setReason] = useState(""),
    [promotion, setPromotion] = useState({
      title: "",
      description: "",
      validUntil: "",
    });
  const lock = useRef(false),
    attempt = useRef({ payload: "", id: "" }),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const api = useCallback(
    async (body: RecordData, moderate = false) => {
      if (!user || !organizationId)
        throw Error("Entre na sua conta e selecione uma instituição.");
      const response = await fetch(
        moderate ? "/api/marketplace/moderate" : "/api/marketplace/community",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ ...body, organizationId }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Não foi possível concluir a operação.");
      return data;
    },
    [user, organizationId],
  );
  useEffect(() => {
    let current = true;
    setLoading(true);
    setReady(false);
    setError("");
    setDetail(null);
    setRows([]);
    const body = ["detail", "edit"].includes(mode)
      ? { action: "detail", storeId }
      : {
          action: "list",
          scope: mode === "new" ? "mine" : mode,
          ...(mode === "moderation" && filter ? { status: filter } : {}),
        };
    api(body)
      .then((data) => {
        if (!current) return;
        setReady(true);
        setStaff(data.staff);
        setRows(data.stores || []);
        setTotal(data.total || 0);
        setCursor(data.cursor || null);
        if (data.store) {
          setDetail(data);
          const s = data.store;
          setForm({
            ...blank,
            ...s.contact?.address,
            name: s.name,
            description: s.description,
            offerings: s.offerings || "",
            category: s.category,
            whatsapp: s.socialLinks?.whatsapp || "",
            website: s.socialLinks?.website || "",
            instagram: s.socialLinks?.instagram || "",
            facebook: s.socialLinks?.facebook || "",
            email: s.contact?.email || "",
            phone: s.contact?.phone || "",
            bannerImageUrl: s.bannerImageUrl || "",
          });
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [api, mode, storeId, filter, revision]);
  async function perform(
    body: RecordData,
    success: string,
    moderate = false,
    reload = true,
  ) {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const payload = JSON.stringify(body);
    if (attempt.current.payload !== payload)
      attempt.current = { payload, id: crypto.randomUUID() };
    try {
      const result = await api(
        { ...body, requestId: attempt.current.id },
        moderate,
      );
      if (!alive.current) return null;
      attempt.current = { payload: "", id: "" };
      setNotice(success);
      if (reload) setRevision((r) => r + 1);
      return result;
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Não foi possível concluir.");
      return null;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const result = await perform(
      {
        action: "save",
        ...(storeId ? { storeId, revision: detail?.store.revision || 0 } : {}),
        fields: form,
      },
      "Loja salva e enviada para análise. Ela ficará visível após a aprovação da equipe.",
      false,
      false,
    );
    if (result) setSavedId(result.storeId);
  }
  async function more() {
    if (lock.current || !cursor) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api({
        action: "list",
        scope: mode,
        cursor,
        ...(mode === "moderation" && filter ? { status: filter } : {}),
      });
      if (alive.current) {
        setRows((previous) => [
          ...previous,
          ...data.stores.filter(
            (s: RecordData) => !previous.some((p) => p.id === s.id),
          ),
        ]);
        setCursor(data.cursor);
        setTotal(data.total);
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const visible = rows.filter(
    (s) =>
      (!category || s.category === category) &&
      (mode !== "mine" || !filter || s.status === filter) &&
      folded(
        [s.name, s.description, s.offerings, s.contact?.address?.city]
          .filter(Boolean)
          .join(" "),
      ).includes(folded(query)),
  );
  const s = detail?.store;
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    setDesktop(!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);
  function whatsapp(store: RecordData, title?: string) {
    const mobile = communityWhatsapp(store, title, desktop);
    if (!mobile) return null;
    return (
      <a
        className={styles.whatsapp}
        href={mobile}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={17} /> WhatsApp
      </a>
    );
  }
  function field(
    key: keyof typeof blank,
    label: string,
    maxLength = 160,
    required = false,
    type = "text",
  ) {
    return (
      <label>
        {label}
        <input
          name={key}
          type={type}
          value={form[key]}
          maxLength={maxLength}
          required={required}
          onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))}
        />
      </label>
    );
  }
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            <Store size={18} /> Economia da comunidade
          </p>
          <h1>
            {mode === "mine"
              ? "Minhas lojas"
              : mode === "moderation"
                ? "Moderação de lojas"
                : mode === "new"
                  ? "Criar loja"
                  : mode === "edit"
                    ? "Editar loja"
                    : mode === "detail"
                      ? "Conheça este negócio"
                      : "Marketplace da Comunidade"}
          </h1>
          <p>
            Encontre produtos e serviços, conheça quem empreende e fale
            diretamente com a loja.
          </p>
        </div>
        <nav aria-label="Marketplace">
          <Link href={base}>Explorar</Link>
          <Link href={`${base}/my-stores`}>Minhas lojas</Link>
          {staff && <Link href={`${base}/admin/moderation`}>Moderação</Link>}
          <Link className={styles.primary} href={`${base}/new`}>
            <Plus size={17} /> Criar loja
          </Link>
        </nav>
      </header>
      {notice && (
        <div className={styles.success} role="status">
          <CheckCircle2 size={20} /> {notice}
        </div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          {error}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => setRevision((r) => r + 1)}
          >
            Recarregar
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Carregando marketplace…</p>
      ) : (
        <>
          {["new", "edit"].includes(mode) &&
            ready &&
            (mode !== "edit" || detail?.canEdit) &&
            (savedId ? (
              <section className={styles.panel}>
                <h2>Cadastro recebido</h2>
                <p>Acompanhe a análise e eventuais ajustes em Minhas lojas.</p>
                <Link
                  className={styles.primary}
                  href={`${base}/${encodeURIComponent(savedId)}`}
                >
                  Ver minha loja
                </Link>
              </section>
            ) : (
              <form onSubmit={save} className={styles.panel}>
                <h2>Apresente seu negócio</h2>
                <p>
                  Ao salvar, o cadastro entra em análise. Alterações em uma loja
                  publicada também precisam de nova aprovação.
                </p>
                <fieldset
                  disabled={busy || imageBusy}
                  className={styles.fields}
                >
                  {field("name", "Nome da loja *", 120, true)}
                  <label>
                    Categoria
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, category: e.target.value }))
                      }
                    >
                      {Object.entries(COMMUNITY_CATEGORIES).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className={styles.wide}>
                    Sobre o negócio *
                    <textarea
                      name="description"
                      required
                      maxLength={3000}
                      value={form.description}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, description: e.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.wide}>
                    Produtos e serviços
                    <textarea
                      name="offerings"
                      maxLength={2000}
                      placeholder="Ex.: bolos por encomenda, salgados e kits para festas. Estes termos entram na busca."
                      value={form.offerings}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, offerings: e.target.value }))
                      }
                    />
                  </label>
                  {field("whatsapp", "WhatsApp com DDD", 40, false, "tel")}
                  {field("email", "E-mail", 254, false, "email")}
                  {field("phone", "Telefone", 40, false, "tel")}
                  {field("website", "Site (https://…)", 500, false, "url")}
                  {field("instagram", "Instagram (usuário)", 120)}
                  {field("facebook", "Facebook (https://…)", 500, false, "url")}
                  <div className={styles.wide}>
                    <h3>Endereço de atendimento</h3>
                    <p>
                      Preencha apenas o endereço que deseja exibir para a
                      comunidade.
                    </p>
                  </div>
                  {field("street", "Rua")}
                  {field("number", "Número")}
                  {field("district", "Bairro")}
                  {field("city", "Cidade")}
                  {field("state", "Estado")}
                  {field("postalCode", "CEP")}
                  <label className={styles.wide}>
                    Imagem da loja
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setImageBusy(true);
                        setError("");
                        try {
                          const image = await prepareBanner(file);
                          if (alive.current)
                            setForm((v) => ({ ...v, bannerImageUrl: image }));
                        } catch (err) {
                          if (alive.current) setError((err as Error).message);
                        } finally {
                          if (alive.current) setImageBusy(false);
                        }
                      }}
                    />
                    <small>
                      JPEG, PNG ou WebP de até 10 MB. A imagem é reduzida antes
                      de salvar.
                    </small>
                  </label>
                  {form.bannerImageUrl && (
                    <div className={styles.wide}>
                      <img
                        className={styles.preview}
                        src={form.bannerImageUrl}
                        alt="Prévia da imagem da loja"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((v) => ({ ...v, bannerImageUrl: "" }))
                        }
                      >
                        Remover imagem
                      </button>
                    </div>
                  )}
                  <p className={styles.wide}>
                    O nome, a descrição e os contatos informados serão exibidos
                    aos membros da instituição após aprovação.
                  </p>
                  <button className={styles.primary} type="submit">
                    {imageBusy
                      ? "Preparando imagem…"
                      : busy
                        ? "Salvando…"
                        : "Salvar e enviar para análise"}
                  </button>
                  <Link href={`${base}/my-stores`}>Voltar às minhas lojas</Link>
                </fieldset>
              </form>
            ))}
          {mode === "edit" && detail && !detail.canEdit && (
            <p role="alert">
              Somente o proprietário pode editar este cadastro.
            </p>
          )}
          {["catalog", "mine", "moderation"].includes(mode) && !error && (
            <>
              <section className={styles.metrics} aria-label="Resumo">
                <div>
                  <strong>{total}</strong>
                  <span>
                    {mode === "catalog"
                      ? "lojas publicadas"
                      : mode === "mine"
                        ? "lojas da sua conta"
                        : filter
                          ? statusName(filter).toLowerCase()
                          : "lojas cadastradas"}
                  </span>
                </div>
                <div>
                  <strong>{visible.length}</strong>
                  <span>
                    resultados nesta lista
                    {cursor ? " • há mais para carregar" : ""}
                  </span>
                </div>
                <div>
                  <strong>
                    {visible.filter((v) => communityWhatsapp(v)).length}
                  </strong>
                  <span>resultados com WhatsApp</span>
                </div>
              </section>
              <section className={styles.panel}>
                <div className={styles.filters}>
                  <label>
                    <span>
                      <Search size={16} /> Buscar na lista carregada
                    </span>
                    <input
                      type="search"
                      placeholder="Nome, produtos, serviços ou cidade"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <label>
                    Categoria
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {Object.entries(COMMUNITY_CATEGORIES).map(
                        ([id, label]) => (
                          <option value={id} key={id}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  {mode !== "catalog" && (
                    <label>
                      Situação
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="">Todas</option>
                        {Object.entries(COMMUNITY_STATUS).map(([id, label]) => (
                          <option value={id} key={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                {mode === "moderation" && (
                  <p>
                    Abra o cadastro para revisar os contatos, aprovar ou
                    solicitar ajustes. Publicar uma loja não representa garantia
                    dos produtos ou serviços.
                  </p>
                )}
              </section>
              <section className={styles.grid}>
                {visible.map((store) => (
                  <article className={styles.card} key={store.id}>
                    {store.bannerImageUrl ? (
                      <img
                        src={store.bannerImageUrl}
                        alt=""
                        className={styles.cover}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.placeholder}>
                        <Store size={32} />
                      </div>
                    )}
                    <div className={styles.cardBody}>
                      <span className={styles.tag}>
                        {categoryName(store.category)}
                      </span>
                      <h2>
                        <Link href={`${base}/${encodeURIComponent(store.id)}`}>
                          {store.name}
                        </Link>
                      </h2>
                      <p>{store.description}</p>
                      {mode !== "catalog" && (
                        <p className={styles.status}>
                          {statusName(store.status)}
                        </p>
                      )}
                      {store.contact?.address?.city && (
                        <small>{store.contact.address.city}</small>
                      )}
                      <div className={styles.actions}>
                        <Link href={`${base}/${encodeURIComponent(store.id)}`}>
                          {mode === "moderation"
                            ? "Revisar cadastro"
                            : "Ver loja"}
                        </Link>
                        {store.status === "approved" && whatsapp(store)}
                        {mode === "mine" && (
                          <Link
                            href={`${base}/${encodeURIComponent(store.id)}/edit`}
                          >
                            Editar
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
              {!visible.length && (
                <section className={styles.empty}>
                  <Store size={38} />
                  <h2>
                    {query || category
                      ? "Nenhuma loja neste filtro"
                      : mode === "moderation"
                        ? "Nenhum cadastro nesta situação"
                        : mode === "mine"
                          ? "Seu negócio pode estar aqui"
                          : "A comunidade está preparando suas primeiras lojas"}
                  </h2>
                  <p>
                    {query || category
                      ? "Experimente outro termo ou categoria."
                      : mode === "mine"
                        ? "Cadastre seu negócio e acompanhe a análise da equipe."
                        : "Os cadastros aprovados ficam disponíveis para os membros da igreja."}
                  </p>
                  {(query || category) && (
                    <button
                      onClick={() => {
                        setQuery("");
                        setCategory("");
                      }}
                    >
                      Limpar filtros
                    </button>
                  )}
                </section>
              )}
              {cursor && (
                <button disabled={busy} onClick={more}>
                  {busy ? "Carregando…" : "Carregar mais lojas"}
                </button>
              )}
            </>
          )}
          {mode === "detail" && s && (
            <>
              <Link href={base}>
                <ArrowLeft size={16} /> Voltar ao marketplace
              </Link>
              <section className={styles.detailGrid}>
                <article className={styles.panel}>
                  {s.bannerImageUrl && (
                    <img
                      src={s.bannerImageUrl}
                      alt=""
                      className={styles.heroImage}
                    />
                  )}
                  <span className={styles.tag}>{categoryName(s.category)}</span>
                  <h2 className={styles.storeTitle}>{s.name}</h2>
                  <p className={styles.preserve}>{s.description}</p>
                  {s.offerings && (
                    <>
                      <h3>Produtos e serviços</h3>
                      <p className={styles.preserve}>{s.offerings}</p>
                    </>
                  )}
                  <p className={styles.status}>{statusName(s.status)}</p>
                  {(s.rejectionReason || s.suspensionReason) && (
                    <p>
                      Orientação da equipe:{" "}
                      {s.rejectionReason || s.suspensionReason}
                    </p>
                  )}
                  {detail.canEdit && (
                    <Link
                      className={styles.primary}
                      href={`${base}/${encodeURIComponent(s.id)}/edit`}
                    >
                      Editar cadastro
                    </Link>
                  )}
                </article>
                <aside className={styles.panel}>
                  <h2>Fale com a loja</h2>
                  <p>
                    Combine preços, disponibilidade e atendimento diretamente
                    com o responsável.
                  </p>
                  <div className={styles.contacts}>
                    {whatsapp(s)}
                    {communityMaps(s) && (
                      <a
                        href={communityMaps(s)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin size={17} /> Abrir endereço no mapa
                      </a>
                    )}
                    {safeCommunityUrl(s.socialLinks?.website) && (
                      <a
                        href={safeCommunityUrl(s.socialLinks.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visitar site
                      </a>
                    )}
                    {/^[A-Za-z0-9._]+$/.test(
                      s.socialLinks?.instagram || "",
                    ) && (
                      <a
                        href={`https://www.instagram.com/${encodeURIComponent(s.socialLinks.instagram)}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Instagram
                      </a>
                    )}
                    {safeCommunityUrl(s.socialLinks?.facebook) && (
                      <a
                        href={safeCommunityUrl(s.socialLinks.facebook)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Facebook
                      </a>
                    )}
                    {s.contact?.email && <p>E-mail: {s.contact.email}</p>}
                    {s.contact?.phone && <p>Telefone: {s.contact.phone}</p>}
                  </div>
                  {!communityWhatsapp(s) && (
                    <p>A loja não informou um WhatsApp válido.</p>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${location.origin}${base}/${encodeURIComponent(s.id)}`,
                        );
                        setNotice(
                          "Link copiado. O acesso exige uma conta da instituição.",
                        );
                      } catch {
                        setError(
                          "Não foi possível copiar. Copie o endereço do navegador.",
                        );
                      }
                    }}
                  >
                    Copiar link da loja
                  </button>
                </aside>
              </section>
              {staff && ["pending", "approved"].includes(s.status) && (
                <section className={styles.panel}>
                  <h2>Análise da equipe</h2>
                  <p>
                    Revise os dados antes de publicar. Para solicitar ajustes ou
                    suspender, informe o motivo ao proprietário.
                  </p>
                  <label>
                    Orientação ao proprietário
                    <textarea
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <div className={styles.actions}>
                    {s.status === "pending" && (
                      <button
                        className={styles.primary}
                        disabled={busy}
                        onClick={() =>
                          perform(
                            {
                              storeId,
                              revision: s.revision || 0,
                              action: "approve",
                              reason: "",
                            },
                            "Loja aprovada e disponível para a comunidade.",
                            true,
                          )
                        }
                      >
                        Aprovar loja
                      </button>
                    )}
                    <button
                      disabled={busy || reason.trim().length < 5}
                      onClick={() =>
                        perform(
                          {
                            storeId,
                            revision: s.revision || 0,
                            action:
                              s.status === "pending" ? "reject" : "suspend",
                            reason,
                          },
                          s.status === "pending"
                            ? "Orientação registrada para o proprietário."
                            : "Loja suspensa. Suas promoções deixaram de aparecer para os membros.",
                          true,
                        )
                      }
                    >
                      {s.status === "pending"
                        ? "Solicitar ajustes"
                        : "Suspender publicação"}
                    </button>
                  </div>
                </section>
              )}
              <section className={styles.panel}>
                <h2>Promoções em destaque</h2>
                <p>
                  As ofertas publicadas aqui aparecem também na área de
                  promoções do app. Não há envio automático de mensagens ou
                  push.
                </p>
                {!detail.promotions.length && !detail.legacyOffers.length && (
                  <p>Nenhuma promoção vigente.</p>
                )}
                {[
                  ...detail.promotions,
                  ...detail.legacyOffers.map((p: RecordData) => ({
                    ...p,
                    legacy: true,
                  })),
                ].map((p: RecordData) => (
                  <article
                    key={`${p.legacy ? "legacy" : "promotion"}:${p.id}`}
                    className={styles.offer}
                  >
                    {p.legacy && safeCommunityUrl(p.images?.[0]) && (
                      <img
                        className={styles.preview}
                        src={safeCommunityUrl(p.images[0])}
                        alt=""
                        loading="lazy"
                      />
                    )}
                    <h3>{p.title}</h3>
                    {p.legacy &&
                      p.type === "percentage" &&
                      Number.isFinite(p.discountPercentage) && (
                        <strong>{p.discountPercentage}% de desconto</strong>
                      )}
                    {p.legacy &&
                      p.type === "fixed_amount" &&
                      Number.isFinite(p.discountAmount) && (
                        <strong>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(p.discountAmount)}{" "}
                          de desconto
                        </strong>
                      )}
                    {p.legacy && p.type === "freebie" && (
                      <strong>Brinde especial</strong>
                    )}
                    <p>{p.description}</p>
                    {p.validUntil && (
                      <small>Válida até {dateLabel(p.validUntil)}</small>
                    )}
                    <div className={styles.actions}>
                      {whatsapp(s, p.title)}
                      {staff && !p.legacy && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            perform(
                              { action: "expire", storeId, promotionId: p.id },
                              "Promoção encerrada.",
                            )
                          }
                        >
                          Encerrar promoção
                        </button>
                      )}
                    </div>
                    {p.legacy && (
                      <small>
                        Oferta de cadastro anterior. Para exibir no app,
                        publique novamente abaixo.
                      </small>
                    )}
                  </article>
                ))}
                {detail.truncated && (
                  <p>Exibindo as primeiras ofertas deste cadastro.</p>
                )}
                {staff && s.status === "approved" && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const result = await perform(
                        { action: "publish", storeId, ...promotion },
                        "Promoção publicada na loja e no app.",
                      );
                      if (result)
                        setPromotion({
                          title: "",
                          description: "",
                          validUntil: "",
                        });
                    }}
                  >
                    <fieldset disabled={busy} className={styles.fields}>
                      <legend>Publicar promoção</legend>
                      <label>
                        Título *
                        <input
                          required
                          maxLength={160}
                          value={promotion.title}
                          onChange={(e) =>
                            setPromotion((v) => ({
                              ...v,
                              title: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Válida até (opcional)
                        <input
                          type="date"
                          value={promotion.validUntil}
                          onChange={(e) =>
                            setPromotion((v) => ({
                              ...v,
                              validUntil: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className={styles.wide}>
                        Condições da oferta
                        <textarea
                          maxLength={2000}
                          value={promotion.description}
                          onChange={(e) =>
                            setPromotion((v) => ({
                              ...v,
                              description: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <button className={styles.primary}>
                        {busy ? "Publicando…" : "Publicar promoção"}
                      </button>
                    </fieldset>
                  </form>
                )}
                {!staff && detail.canEdit && (
                  <p>
                    Para divulgar uma promoção no app, solicite a publicação à
                    equipe da igreja.
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
