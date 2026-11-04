"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Search,
  Music,
  Save,
  RefreshCw,
  X,
  Pencil,
  Maximize2,
  Printer,
  Download,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pause,
  Play,
} from "lucide-react";
import type { WorshipSong, WorshipSetlist } from "@alvo/types";
import {
  WORSHIP_KEYS,
  validWorshipKey,
  importWorshipText,
  worshipShapeKey,
} from "@alvo/domain";
import { useAppAuth } from "../../../app/providers";
import { WorshipChart } from "./worship-chart-view";
type WorshipEvent = {
  id: string;
  name: string;
  startsAt: string;
  status: string;
};
type Snapshot = {
  songs: WorshipSong[];
  events: WorshipEvent[];
  setlists: WorshipSetlist[];
  canManage: boolean;
};
type Draft = {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  preferredKey: string;
  tempoBpm: string;
  chordsLyrics: string;
  spotifyUrl: string;
  youtubeUrl: string;
  expectedVersion: number;
};
const empty = (): Draft => ({
  id: crypto.randomUUID(),
  title: "",
  artist: "",
  originalKey: "C",
  preferredKey: "C",
  tempoBpm: "",
  chordsLyrics: "",
  spotifyUrl: "",
  youtubeUrl: "",
  expectedVersion: 0,
});
const keys = WORSHIP_KEYS.flatMap((k) => [k, `${k}m`]);
const EMPTY: Snapshot = {
  songs: [],
  events: [],
  setlists: [],
  canManage: false,
};
function Modal({
  title,
  close,
  busy,
  live = false,
  children,
}: {
  title: string;
  close: () => void;
  busy: boolean;
  live?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => {
      el?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`worship-dialog${live ? " worship-live" : ""}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className="worship-btn"
          onClick={close}
          disabled={busy}
          aria-label="Fechar formulário"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function KeyOptions({ minor }: { minor?: boolean } = {}) {
  return (
    <>
      {keys
        .filter((k) => minor === undefined || k.endsWith("m") === minor)
        .map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
    </>
  );
}
function trustedLink(value: string | undefined, kind: "youtube" | "spotify") {
  try {
    const u = new URL(value || "");
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (kind === "spotify"
        ? ["open.spotify.com"]
        : ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]
      ).includes(u.hostname)
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function WorshipView() {
  const { user, organizationId } = useAppAuth();
  const [data, setData] = useState<Snapshot>(EMPTY),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState(""),
    [selectedKey, setSelectedKey] = useState("C"),
    [query, setQuery] = useState(""),
    [font, setFont] = useState(18),
    [capo, setCapo] = useState(0),
    [lyricsOnly, setLyricsOnly] = useState(false),
    [settingsReady, setSettingsReady] = useState("");
  const [dialog, setDialog] = useState<"edit" | "setlist" | "live" | null>(
      null,
    ),
    [draft, setDraft] = useState<Draft>(empty),
    [formError, setFormError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false);
  const [eventId, setEventId] = useState(""),
    [setSongs, setSetSongs] = useState<WorshipSetlist["songs"]>([]),
    [setVersion, setSetVersion] = useState(""),
    [addId, setAddId] = useState("");
  const [autoScroll, setAutoScroll] = useState(false),
    [speed, setSpeed] = useState(25),
    [liveIndex, setLiveIndex] = useState(0),
    [printHost, setPrintHost] = useState<HTMLDivElement | null>(null);
  const liveScroll = useRef<HTMLDivElement>(null),
    mutation = useRef(false),
    scope = useRef(organizationId),
    sequence = useRef(0),
    setlistKey = useRef<string | null>(null);
  scope.current = organizationId;
  const storage = `esdras-worship:${organizationId}:${user?.uid || ""}`;
  const call = useCallback(
    async (body: Record<string, unknown>) => {
      if (!user) throw Error("Entre na sua conta.");
      const res = await fetch("/api/worship", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ organizationId, ...body }),
        signal: AbortSignal.timeout(30000),
      });
      const value = await res.json();
      if (!res.ok) throw Error(value.error || "Não foi possível concluir.");
      return value;
    },
    [organizationId, user],
  );
  const load = useCallback(async () => {
    const run = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const value = await call({ action: "snapshot" });
      if (run === sequence.current) setData(value);
    } catch (e) {
      if (run === sequence.current)
        setError(
          e instanceof Error ? e.message : "Falha ao carregar repertório.",
        );
    } finally {
      if (run === sequence.current) setLoading(false);
    }
  }, [call]);
  useEffect(() => {
    setData(EMPTY);
    setDialog(null);
    setNotice("");
    setSelectedId("");
    setEventId("");
    setlistKey.current = null;
    setSettingsReady("");
    mutation.current = false;
    setBusy(false);
    void load();
    return () => {
      sequence.current++;
    };
  }, [load]);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storage) || "{}");
      setFont(
        Number.isInteger(value.font) && value.font >= 14 && value.font <= 30
          ? value.font
          : 18,
      );
      setCapo(
        Number.isInteger(value.capo) && value.capo >= 0 && value.capo <= 11
          ? value.capo
          : 0,
      );
      setLyricsOnly(value.lyricsOnly === true);
      setSelectedId(typeof value.song === "string" ? value.song : "");
      setEventId(typeof value.event === "string" ? value.event : "");
    } catch {
      setFont(18);
      setCapo(0);
      setLyricsOnly(false);
    }
    setSettingsReady(storage);
  }, [storage]);
  useEffect(() => {
    if (settingsReady === storage)
      try {
        localStorage.setItem(
          storage,
          JSON.stringify({
            font,
            capo,
            lyricsOnly,
            song: selectedId,
            event: eventId,
          }),
        );
      } catch {
        /* A blocked storage must not prevent reading. */
      }
  }, [storage, settingsReady, font, capo, lyricsOnly, selectedId, eventId]);
  const selectedSong =
    data.songs.find((s) => s.id === selectedId) || data.songs[0];
  useEffect(() => {
    if (selectedSong) {
      setSelectedKey(
        setlistKey.current ||
          selectedSong.preferredKey ||
          selectedSong.originalKey,
      );
      setlistKey.current = null;
    }
  }, [selectedSong?.id, selectedSong?.preferredKey, selectedSong?.originalKey]);
  useEffect(() => {
    const el = document.createElement("div");
    el.id = "esdras-worship-print";
    document.body.appendChild(el);
    setPrintHost(el);
    const cleanup = () => document.body.classList.remove("worship-printing");
    window.addEventListener("afterprint", cleanup);
    return () => {
      el.remove();
      cleanup();
      window.removeEventListener("afterprint", cleanup);
    };
  }, []);
  const filtered = useMemo(
    () =>
      data.songs
        .filter((s) =>
          `${s.title} ${s.artist}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(
              query
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase(),
            ),
        )
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [data.songs, query],
  );
  const currentSet = data.setlists.find((s) => s.eventId === eventId);
  const performanceSongs = (currentSet?.songs || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((item) => {
      const song = data.songs.find((s) => s.id === item.songId);
      return song ? [{ song, key: item.selectedKey }] : [];
    });
  const liveEntry = performanceSongs[liveIndex],
    liveSong = liveEntry?.song || selectedSong,
    liveKey = liveEntry?.key || selectedKey;
  useEffect(() => {
    setAutoScroll(false);
    if (liveScroll.current) liveScroll.current.scrollTop = 0;
  }, [dialog, liveSong?.id, liveIndex]);
  useEffect(() => {
    if (!autoScroll || dialog !== "live") return;
    let last = 0,
      frame = 0,
      position = liveScroll.current?.scrollTop || 0;
    const tick = (time: number) => {
      const el = liveScroll.current;
      if (!el || document.hidden) {
        setAutoScroll(false);
        return;
      }
      if (last) {
        position += (Math.min(time - last, 100) * speed) / 1000;
        el.scrollTop = position;
      }
      last = time;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        setAutoScroll(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoScroll, dialog, speed]);
  function openEditor(song?: WorshipSong) {
    setFormError("");
    setPreview(false);
    setDraft(
      song
        ? {
            id: song.id,
            title: song.title,
            artist: song.artist,
            originalKey: song.originalKey,
            preferredKey: song.preferredKey || song.originalKey,
            tempoBpm: song.tempoBpm ? String(song.tempoBpm) : "",
            chordsLyrics: song.chordsLyrics || "",
            spotifyUrl: song.spotifyUrl || "",
            youtubeUrl: song.youtubeUrl || "",
            expectedVersion: song.version || 0,
          }
        : empty(),
    );
    setDialog("edit");
  }
  async function mutate(body: Record<string, unknown>, success: string) {
    if (mutation.current) return null;
    mutation.current = true;
    setBusy(true);
    setFormError("");
    setError("");
    setNotice("Salvando…");
    const org = organizationId;
    try {
      const result = await call(body);
      if (scope.current !== org) return null;
      setNotice(success);
      return result;
    } catch (e) {
      if (scope.current === org) {
        setNotice("");
        setError(e instanceof Error ? e.message : "Não foi possível salvar.");
        setFormError(
          e instanceof Error ? e.message : "Não foi possível salvar.",
        );
      }
      return null;
    } finally {
      if (scope.current === org) {
        mutation.current = false;
        setBusy(false);
      }
    }
  }
  async function saveSong(e: FormEvent) {
    e.preventDefault();
    const result = await mutate(
      {
        action: "save-song",
        ...draft,
        tempoBpm: draft.tempoBpm ? Number(draft.tempoBpm) : null,
      },
      "Música salva para a equipe.",
    );
    if (result) {
      setData((d) => ({
        ...d,
        songs: [...d.songs.filter((s) => s.id !== result.song.id), result.song],
      }));
      setSelectedId(result.song.id);
      setSelectedKey(result.song.preferredKey);
      setDialog(null);
    }
  }
  async function saveKey() {
    if (!selectedSong) return;
    const result = await mutate(
      {
        action: "save-key",
        id: selectedSong.id,
        expectedVersion: selectedSong.version || 0,
        preferredKey: selectedKey,
      },
      "Tom da equipe salvo. Já está disponível para o app.",
    );
    if (result)
      setData((d) => ({
        ...d,
        songs: d.songs.map((s) => (s.id === result.song.id ? result.song : s)),
      }));
  }
  function chooseEvent(id: string) {
    setEventId(id);
  }
  function openSetlist() {
    const list = data.setlists.find((s) => s.eventId === eventId);
    setSetSongs(
      (list?.songs || []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
    );
    setSetVersion(list?.updatedAt || "");
    setAddId("");
    setFormError("");
    setDialog("setlist");
  }
  async function saveSetlist(e: FormEvent) {
    e.preventDefault();
    const result = await mutate(
      {
        action: "save-setlist",
        eventId,
        songs: setSongs,
        expectedUpdatedAt: setVersion,
      },
      "Repertório do evento salvo. Ordem e tons disponíveis no app.",
    );
    if (result) {
      setData((d) => ({
        ...d,
        setlists: [
          ...d.setlists.filter((s) => s.eventId !== eventId),
          result.setlist,
        ],
      }));
      setDialog(null);
    }
  }
  function move(index: number, direction: number) {
    setSetSongs((s) => {
      const next = [...s];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 120000) {
      setFormError("Arquivo muito grande. Use texto de até 120 KB.");
      return;
    }
    try {
      const result = importWorshipText(await file.text());
      if (result.text.length > 60000)
        throw Error("A cifra deve ter até 60 mil caracteres.");
      setDraft((d) => ({
        ...d,
        chordsLyrics: result.text,
        title: result.title || d.title,
        artist: result.artist || d.artist,
        originalKey: validWorshipKey(result.key) ? result.key : d.originalKey,
        preferredKey: validWorshipKey(result.key) ? result.key : d.preferredKey,
        tempoBpm:
          result.tempo && /^\d+$/.test(result.tempo)
            ? result.tempo
            : d.tempoBpm,
      }));
      setFormError("");
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Não foi possível ler esse arquivo.",
      );
    }
  }
  function download() {
    if (!selectedSong) return;
    const blob = new Blob([selectedSong.chordsLyrics || ""], {
        type: "text/plain;charset=utf-8",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSong.title.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 80)}.cho`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function print() {
    if (!printHost) return;
    document.body.classList.add("worship-printing");
    window.print();
    document.body.classList.remove("worship-printing");
  }
  const readerControls = (
    <div className="worship-controls">
      <label>
        Tom de leitura
        <select
          aria-label="Tom de leitura"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
        >
          <KeyOptions minor={selectedSong?.originalKey.endsWith("m")} />
        </select>
      </label>
      <label>
        Capotraste
        <select value={capo} onChange={(e) => setCapo(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {i === 0 ? "Sem capo" : `Casa ${i}`}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tamanho da letra
        <select value={font} onChange={(e) => setFont(Number(e.target.value))}>
          {[14, 16, 18, 20, 24, 28, 30].map((n) => (
            <option value={n} key={n}>
              {n} px
            </option>
          ))}
        </select>
      </label>
      <label className="worship-toggle">
        <input
          type="checkbox"
          checked={lyricsOnly}
          onChange={(e) => setLyricsOnly(e.target.checked)}
        />
        Somente letra
      </label>
    </div>
  );
  return (
    <div className="worship-studio">
      <header className="worship-heading">
        <div>
          <h1>Louvor e cifras</h1>
          <p>Prepare o repertório e leia a cifra com espaço para tocar.</p>
        </div>
        <div className="worship-actions">
          <button
            className="worship-btn"
            onClick={() => void load()}
            disabled={loading || busy}
          >
            <RefreshCw size={17} />
            Atualizar biblioteca
          </button>
          {data.canManage && (
            <button
              className="worship-btn primary"
              onClick={() => openEditor()}
              disabled={busy}
            >
              <Plus size={18} />
              Nova música
            </button>
          )}
        </div>
      </header>
      {notice && (
        <p role="status" className="worship-notice">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="worship-error">
          {error}
        </p>
      )}
      {loading && <p role="status">Carregando repertório…</p>}
      {!loading && (
        <>
          <section
            className="worship-event-bar"
            aria-label="Repertório por evento"
          >
            <label>
              Culto ou evento
              <select
                value={eventId}
                onChange={(e) => chooseEvent(e.target.value)}
              >
                <option value="">Leitura da biblioteca</option>
                {data.events
                  .filter((e) => !["cancelled", "canceled"].includes(e.status))
                  .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                      {e.startsAt
                        ? ` · ${new Date(e.startsAt).toLocaleDateString("pt-BR")}`
                        : ""}
                    </option>
                  ))}
              </select>
            </label>
            {data.canManage && (
              <button
                className="worship-btn"
                disabled={!eventId || busy}
                onClick={openSetlist}
              >
                Organizar repertório
              </button>
            )}
            <span>
              {eventId
                ? `${currentSet?.songs.length || 0} músicas neste evento`
                : `${data.songs.length} músicas na biblioteca`}
            </span>
          </section>
          <div className="worship-layout">
            <aside className="worship-library-v2">
              <h2>Biblioteca</h2>
              <label className="worship-search">
                <Search size={17} />
                <input
                  type="search"
                  aria-label="Buscar música ou artista"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Música ou artista"
                />
              </label>
              <div className="worship-library-list">
                {filtered.map((song) => (
                  <button
                    type="button"
                    className={`worship-library-item${song.id === selectedSong?.id ? " selected" : ""}`}
                    aria-pressed={song.id === selectedSong?.id}
                    key={song.id}
                    onClick={() => {
                      setlistKey.current = null;
                      setSelectedId(song.id);
                      setSelectedKey(song.preferredKey || song.originalKey);
                    }}
                  >
                    <strong>{song.title}</strong>
                    <span>{song.artist}</span>
                    <small>
                      Tom da equipe {song.preferredKey || song.originalKey}
                      {song.tempoBpm ? ` · ${song.tempoBpm} BPM` : ""}
                    </small>
                  </button>
                ))}
                {!filtered.length && (
                  <p>
                    {query
                      ? "Nenhuma música encontrada."
                      : "Cadastre a primeira música da sua igreja."}
                  </p>
                )}
              </div>
              {eventId && (
                <section className="worship-event-list">
                  <h3>Sequência do evento</h3>
                  {!performanceSongs.length && (
                    <p>Organize as músicas e os tons antes do culto.</p>
                  )}
                  {performanceSongs.map((entry, i) => (
                    <button
                      className="worship-btn"
                      key={`${entry.song.id}-${i}`}
                      onClick={() => {
                        setlistKey.current =
                          selectedSong?.id === entry.song.id ? null : entry.key;
                        setSelectedId(entry.song.id);
                        setSelectedKey(entry.key);
                      }}
                    >
                      {i + 1}. {entry.song.title} · {entry.key}
                    </button>
                  ))}
                </section>
              )}
            </aside>
            <article className="worship-reader">
              {selectedSong ? (
                <>
                  <header className="worship-song-title">
                    <div>
                      <p>{selectedSong.artist}</p>
                      <h2>{selectedSong.title}</h2>
                      <p>
                        Original: <strong>{selectedSong.originalKey}</strong> ·
                        Equipe:{" "}
                        <strong>
                          {selectedSong.preferredKey ||
                            selectedSong.originalKey}
                        </strong>
                        {selectedSong.tempoBpm
                          ? ` · ${selectedSong.tempoBpm} BPM`
                          : ""}
                      </p>
                    </div>
                    {data.canManage && (
                      <button
                        className="worship-btn"
                        onClick={() => openEditor(selectedSong)}
                        disabled={busy}
                      >
                        <Pencil size={17} />
                        Editar música
                      </button>
                    )}
                  </header>
                  {readerControls}
                  <p className="worship-reading-info">
                    Som: <strong>{selectedKey}</strong>
                    {capo > 0 && (
                      <>
                        {" "}
                        · Acordes para tocar:{" "}
                        <strong>{worshipShapeKey(selectedKey, capo)}</strong> ·
                        Capo na casa {capo}
                      </>
                    )}
                    .{" "}
                    {eventId &&
                    performanceSongs.some(
                      (entry) =>
                        entry.song.id === selectedSong.id &&
                        entry.key === selectedKey,
                    )
                      ? "Tom salvo para este evento. O tom padrão da biblioteca permanece separado."
                      : selectedKey !==
                          (selectedSong.preferredKey ||
                            selectedSong.originalKey)
                        ? "Prévia de tom; salve para compartilhar com a equipe."
                        : "Tom da equipe carregado."}
                  </p>
                  <div className="worship-actions">
                    {data.canManage && (
                      <button
                        className="worship-btn"
                        disabled={
                          busy ||
                          selectedKey ===
                            (selectedSong.preferredKey ||
                              selectedSong.originalKey)
                        }
                        onClick={() => void saveKey()}
                      >
                        <Save size={17} />
                        Salvar tom da equipe
                      </button>
                    )}
                    <button
                      className="worship-btn primary"
                      onClick={() => {
                        setLiveIndex(
                          Math.max(
                            0,
                            performanceSongs.findIndex(
                              (p) => p.song.id === selectedSong.id,
                            ),
                          ),
                        );
                        setDialog("live");
                      }}
                    >
                      <Maximize2 size={17} />
                      Modo de ensaio
                    </button>
                    <button className="worship-btn" onClick={print}>
                      <Printer size={17} />
                      Imprimir cifra / PDF
                    </button>
                    <button className="worship-btn" onClick={download}>
                      <Download size={17} />
                      Exportar cifra
                    </button>
                    {trustedLink(selectedSong.youtubeUrl, "youtube") && (
                      <a
                        className="worship-btn"
                        href={trustedLink(selectedSong.youtubeUrl, "youtube")}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        YouTube
                      </a>
                    )}
                    {trustedLink(selectedSong.spotifyUrl, "spotify") && (
                      <a
                        className="worship-btn"
                        href={trustedLink(selectedSong.spotifyUrl, "spotify")}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Spotify
                      </a>
                    )}
                  </div>
                  {!selectedSong.chordsLyrics ? (
                    <p>
                      Esta música ainda não tem cifra. A liderança pode
                      adicioná-la em Editar música.
                    </p>
                  ) : (
                    <WorshipChart
                      source={selectedSong.chordsLyrics}
                      originalKey={selectedSong.originalKey}
                      selectedKey={selectedKey}
                      capo={capo}
                      lyricsOnly={lyricsOnly}
                      fontSize={font}
                    />
                  )}
                </>
              ) : (
                <div className="worship-empty">
                  <Music size={28} />
                  <h2>Seu repertório começa aqui</h2>
                  <p>
                    Cadastre músicas próprias ou cifras que sua igreja tem
                    autorização para utilizar.
                  </p>
                  {data.canManage && (
                    <button
                      className="worship-btn primary"
                      onClick={() => openEditor()}
                    >
                      Cadastrar primeira música
                    </button>
                  )}
                </div>
              )}
            </article>
          </div>
        </>
      )}
      {dialog === "edit" && (
        <Modal
          title={
            draft.expectedVersion || data.songs.some((s) => s.id === draft.id)
              ? "Editar música"
              : "Nova música"
          }
          busy={busy}
          close={() => setDialog(null)}
        >
          <form className="worship-editor" onSubmit={saveSong}>
            <p>
              Acordes entre colchetes ficam acima da sílaba na leitura. Exemplo:
              A [C]paz vai [G/B]florescer.
            </p>
            <div className="worship-form-two">
              <label>
                Título
                <input
                  required
                  maxLength={180}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, title: e.target.value }))
                  }
                />
              </label>
              <label>
                Artista / ministério
                <input
                  required
                  maxLength={180}
                  value={draft.artist}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, artist: e.target.value }))
                  }
                />
              </label>
              <label>
                Tom original
                <select
                  value={draft.originalKey}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      originalKey: e.target.value,
                      preferredKey: e.target.value,
                    }))
                  }
                >
                  <KeyOptions />
                </select>
              </label>
              <label>
                Tom da equipe
                <select
                  value={draft.preferredKey}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, preferredKey: e.target.value }))
                  }
                >
                  <KeyOptions minor={draft.originalKey.endsWith("m")} />
                </select>
              </label>
              <label>
                BPM (opcional)
                <input
                  type="number"
                  min={20}
                  max={300}
                  step={1}
                  value={draft.tempoBpm}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, tempoBpm: e.target.value }))
                  }
                />
              </label>
              <label>
                Importar texto ou ChordPro
                <input
                  type="file"
                  accept=".txt,.cho,.chordpro,.chopro,text/plain"
                  onChange={(e) => void importFile(e.target.files?.[0])}
                />
              </label>
              <label>
                Link YouTube
                <input
                  type="url"
                  value={draft.youtubeUrl}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, youtubeUrl: e.target.value }))
                  }
                />
              </label>
              <label>
                Link Spotify
                <input
                  type="url"
                  value={draft.spotifyUrl}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, spotifyUrl: e.target.value }))
                  }
                />
              </label>
            </div>
            <label>
              Letra cifrada
              <textarea
                className="worship-source"
                required
                maxLength={60000}
                value={draft.chordsLyrics}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, chordsLyrics: e.target.value }))
                }
                placeholder={
                  "[Verso 1]\nUm [C]novo dia [F]vai nascer\n\n[Refrão]\n[G]Juntos a [C]caminhar"
                }
              />
            </label>
            <p>
              Importação converte linhas convencionais de acordes sobre a letra.
              Suporta acordes, inversões, seções e diretivas básicas de
              ChordPro; confira a prévia. Trocar o tom original não reescreve a
              cifra digitada.
            </p>
            <button
              className="worship-btn"
              type="button"
              onClick={() => setPreview((v) => !v)}
              aria-expanded={preview}
            >
              {preview ? "Ocultar prévia" : "Conferir prévia da cifra"}
            </button>
            {preview && (
              <WorshipChart
                source={draft.chordsLyrics}
                originalKey={draft.originalKey}
                selectedKey={draft.preferredKey}
              />
            )}
            <p>
              Conteúdo salvo para os membros da instituição. Use músicas e
              cifras autorizadas.
            </p>
            {formError && (
              <p role="alert" className="worship-error">
                {formError}
              </p>
            )}
            <footer>
              <button
                className="worship-btn"
                type="button"
                onClick={() => setDialog(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                className="worship-btn primary"
                type="submit"
                disabled={busy}
              >
                <Save size={17} />
                {busy ? "Salvando…" : "Salvar música"}
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {dialog === "setlist" && (
        <Modal
          title="Repertório do evento"
          busy={busy}
          close={() => setDialog(null)}
        >
          <form className="worship-editor" onSubmit={saveSetlist}>
            <p>
              {data.events.find((e) => e.id === eventId)?.name}. Ordem e tons
              deste evento são independentes do tom padrão da biblioteca.
            </p>
            <label>
              Adicionar música
              <select value={addId} onChange={(e) => setAddId(e.target.value)}>
                <option value="">Selecione uma música</option>
                {data.songs.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="worship-btn"
              disabled={!addId || setSongs.length >= 40}
              onClick={() => {
                const song = data.songs.find((s) => s.id === addId);
                if (song)
                  setSetSongs((s) => [
                    ...s,
                    {
                      songId: song.id,
                      selectedKey: song.preferredKey || song.originalKey,
                      sortOrder: s.length,
                    },
                  ]);
                setAddId("");
              }}
            >
              Adicionar ao repertório
            </button>
            <ol className="worship-set-editor">
              {setSongs.map((item, index) => (
                <li key={`${item.songId}-${index}`}>
                  <strong>
                    {index + 1}.{" "}
                    {data.songs.find((s) => s.id === item.songId)?.title ||
                      "Música indisponível"}
                  </strong>
                  <label>
                    Tom da música {index + 1}
                    <select
                      value={item.selectedKey}
                      onChange={(e) =>
                        setSetSongs((s) =>
                          s.map((v, i) =>
                            i === index
                              ? { ...v, selectedKey: e.target.value }
                              : v,
                          ),
                        )
                      }
                    >
                      <KeyOptions
                        minor={data.songs
                          .find((s) => s.id === item.songId)
                          ?.originalKey.endsWith("m")}
                      />
                    </select>
                  </label>
                  <div className="worship-actions">
                    <button
                      className="worship-btn"
                      type="button"
                      disabled={index === 0}
                      aria-label={`Subir música ${index + 1}`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      className="worship-btn"
                      type="button"
                      disabled={index === setSongs.length - 1}
                      aria-label={`Descer música ${index + 1}`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={18} />
                    </button>
                    <button
                      className="worship-btn"
                      type="button"
                      aria-label={`Remover música ${index + 1} do repertório`}
                      onClick={() =>
                        setSetSongs((s) => s.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            {formError && (
              <p role="alert" className="worship-error">
                {formError}
              </p>
            )}
            <footer>
              <button
                className="worship-btn"
                type="button"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="worship-btn primary"
                disabled={busy}
              >
                Salvar repertório
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {dialog === "live" && liveSong && (
        <Modal
          title="Modo de ensaio"
          busy={false}
          close={() => setDialog(null)}
          live
        >
          <div className="worship-live-toolbar">
            <strong>
              {liveSong.title} · Som {liveKey}
              {capo
                ? ` · Capo ${capo} · Acordes ${worshipShapeKey(liveKey, capo)}`
                : ""}
            </strong>
            <div className="worship-actions">
              <button
                className="worship-btn"
                onClick={() => setFont((n) => Math.max(14, n - 2))}
                aria-label="Diminuir letra"
              >
                A−
              </button>
              <button
                className="worship-btn"
                onClick={() => setFont((n) => Math.min(30, n + 2))}
                aria-label="Aumentar letra"
              >
                A+
              </button>
              <button
                className="worship-btn"
                aria-pressed={autoScroll}
                onClick={() => setAutoScroll((v) => !v)}
              >
                {autoScroll ? <Pause size={18} /> : <Play size={18} />}Rolagem{" "}
                {autoScroll ? "pausável" : "automática"}
              </button>
              <label>
                Velocidade
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <option value={12}>Lenta</option>
                  <option value={25}>Média</option>
                  <option value={45}>Rápida</option>
                </select>
              </label>
              {performanceSongs.length > 0 && (
                <>
                  <button
                    className="worship-btn"
                    disabled={liveIndex === 0}
                    onClick={() => setLiveIndex((i) => i - 1)}
                  >
                    Anterior
                  </button>
                  <span>
                    {liveIndex + 1}/{performanceSongs.length}
                  </span>
                  <button
                    className="worship-btn"
                    disabled={liveIndex === performanceSongs.length - 1}
                    onClick={() => setLiveIndex((i) => i + 1)}
                  >
                    Próxima
                  </button>
                </>
              )}
            </div>
          </div>
          <div
            ref={liveScroll}
            className="worship-live-score"
            onWheel={() => setAutoScroll(false)}
            onTouchStart={() => setAutoScroll(false)}
          >
            <WorshipChart
              source={liveSong.chordsLyrics || ""}
              originalKey={liveSong.originalKey}
              selectedKey={liveKey}
              capo={capo}
              lyricsOnly={lyricsOnly}
              fontSize={font}
            />
          </div>
        </Modal>
      )}
      {printHost &&
        selectedSong &&
        createPortal(
          <>
            <style>{`#esdras-worship-print{display:none}@media print{body.worship-printing>*:not(#esdras-worship-print){display:none!important}body.worship-printing #esdras-worship-print{display:block!important;color:#111;background:white;font-family:Arial,sans-serif}body.worship-printing #esdras-worship-print header{border-bottom:1px solid #777;margin-bottom:6mm;padding-bottom:3mm}body.worship-printing .worship-score{padding:0;border:0;background:white;color:#111}body.worship-printing .worship-score strong{color:#111}body.worship-printing .worship-score-line{break-inside:avoid}body.worship-printing .worship-score-section{break-after:avoid}@page{size:A4;margin:15mm}}`}</style>
            <header>
              <p>PLATAFORMA ESDRAS · Cifra</p>
              <h1>{selectedSong.title}</h1>
              <p>
                {selectedSong.artist} · Som: {selectedKey}
                {capo
                  ? ` · Capo: ${capo} · Acordes: ${worshipShapeKey(selectedKey, capo)}`
                  : ""}
                {selectedSong.tempoBpm ? ` · ${selectedSong.tempoBpm} BPM` : ""}
              </p>
            </header>
            <WorshipChart
              source={selectedSong.chordsLyrics || ""}
              originalKey={selectedSong.originalKey}
              selectedKey={selectedKey}
              capo={capo}
              lyricsOnly={lyricsOnly}
              fontSize={14}
            />
          </>,
          printHost,
        )}
    </div>
  );
}
