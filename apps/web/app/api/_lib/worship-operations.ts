import { AccountError, accountTransaction } from "./member-account-store";
import { documentId } from "./member-account";
import { financeActor, textField } from "./finance-operations";
import { assertModuleEnabled } from "./module-access";
import { validWorshipKey } from "@alvo/domain";
function link(value: unknown, kind: "spotify" | "youtube") {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || value.length > 1000)
    throw new AccountError(400, "Link inválido.");
  try {
    const u = new URL(value);
    const hosts =
      kind === "spotify"
        ? ["open.spotify.com"]
        : ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      !hosts.includes(u.hostname)
    )
      throw Error();
    return u.href;
  } catch {
    throw new AccountError(
      400,
      `Informe um link HTTPS válido do ${kind === "spotify" ? "Spotify" : "YouTube"}.`,
    );
  }
}
export async function worshipOperation(raw: Record<string, any>, uid: string) {
  const orgId = documentId(raw.organizationId, "Instituição");
  return accountTransaction(async (tx) => {
    const root = `organizations/${orgId}`;
    await assertModuleEnabled(tx, root, "volunteers");
    const { actor } = await financeActor(
      tx,
      orgId,
      uid,
      raw.action !== "snapshot",
      null,
    );
    if (raw.action === "snapshot") {
      const [songs, events, setlists] = await Promise.all([
        tx.query(root, "worshipSongs", undefined, undefined, "EQUAL", 501),
        tx.query(root, "events", undefined, undefined, "EQUAL", 501),
        tx.query(root, "worshipSetlists", undefined, undefined, "EQUAL", 501),
      ]);
      if ([songs, events, setlists].some((rows) => rows.length > 500))
        throw new AccountError(
          409,
          "Biblioteca acima do limite desta consulta. Procure o suporte para paginar o repertório.",
        );
      return {
        songs: songs.filter((s) => s.organizationId === orgId),
        events: events
          .filter((e) => e.organizationId === orgId)
          .map((e) => ({
            id: e.id,
            name: e.name || e.title || "Evento",
            startsAt: e.startsAt || e.startDate || "",
            status: e.status || "",
          })),
        setlists: setlists.filter((s) => s.organizationId === orgId),
        canManage:
          actor.roles?.some((r: string) =>
            ["super_admin", "church_admin", "pastor", "secretary"].includes(r),
          ) === true,
      };
    }
    const now = new Date().toISOString();
    if (raw.action === "save-song" || raw.action === "save-key") {
      const id = documentId(raw.id, "Música"),
        path = `${root}/worshipSongs/${id}`,
        [old] = await tx.read(path);
      if (old && old.organizationId !== orgId)
        throw new AccountError(404, "Música não encontrada.");
      if (
        !Number.isInteger(raw.expectedVersion) ||
        raw.expectedVersion !== (old?.version || 0)
      )
        throw new AccountError(
          409,
          "Esta música foi alterada por outra pessoa. Atualize a biblioteca antes de salvar.",
        );
      if (raw.action === "save-key" && !old)
        throw new AccountError(404, "Música não encontrada.");
      const preferredKey = textField(raw.preferredKey, "Tom da equipe", 3);
      if (!validWorshipKey(preferredKey))
        throw new AccountError(400, "Tom da equipe inválido.");
      const sourceKey =
        raw.action === "save-song" ? raw.originalKey : old?.originalKey;
      if (
        typeof sourceKey === "string" &&
        sourceKey.endsWith("m") !== preferredKey.endsWith("m")
      )
        throw new AccountError(
          400,
          "A transposição mantém o modo maior ou menor. Para mudar o modo, edite também o arranjo e o tom original.",
        );
      let row: Record<string, any> = {
        ...old,
        id,
        organizationId: orgId,
        preferredKey,
        version: (old?.version || 0) + 1,
        createdAt: old?.createdAt || now,
        updatedAt: now,
      };
      if (raw.action === "save-song") {
        const originalKey = textField(raw.originalKey, "Tom original", 3);
        if (!validWorshipKey(originalKey))
          throw new AccountError(400, "Tom original inválido.");
        if (
          typeof raw.chordsLyrics !== "string" ||
          raw.chordsLyrics.length > 60000 ||
          !raw.chordsLyrics.trim() ||
          raw.chordsLyrics.includes("\u0000")
        )
          throw new AccountError(
            400,
            "Informe a letra cifrada com até 60 mil caracteres.",
          );
        const bpm =
          raw.tempoBpm === null ||
          raw.tempoBpm === "" ||
          raw.tempoBpm === undefined
            ? null
            : raw.tempoBpm;
        if (bpm !== null && (!Number.isInteger(bpm) || bpm < 20 || bpm > 300))
          throw new AccountError(
            400,
            "BPM deve ser um número inteiro entre 20 e 300 ou ficar vazio.",
          );
        row = {
          ...row,
          title: textField(raw.title, "Título", 180),
          artist: textField(raw.artist, "Artista / ministério", 180),
          originalKey,
          tempoBpm: bpm,
          chordsLyrics: raw.chordsLyrics.replace(/\r\n?/g, "\n"),
          spotifyUrl: link(raw.spotifyUrl, "spotify"),
          youtubeUrl: link(raw.youtubeUrl, "youtube"),
        };
      }
      tx.set(path, row);
      tx.set(`${root}/worshipAudit/${crypto.randomUUID()}`, {
        organizationId: orgId,
        actorId: uid,
        action: raw.action,
        songId: id,
        version: row.version,
        at: now,
      });
      return { song: row };
    }
    if (raw.action === "save-setlist") {
      const eventId = documentId(raw.eventId, "Evento"),
        path = `${root}/worshipSetlists/${eventId}`,
        [event, old] = await tx.read(`${root}/events/${eventId}`, path);
      if (
        event?.organizationId !== orgId ||
        ["cancelled", "canceled"].includes(event.status)
      )
        throw new AccountError(404, "Evento indisponível.");
      if ((old?.updatedAt || "") !== raw.expectedUpdatedAt)
        throw new AccountError(
          409,
          "O repertório deste evento mudou. Atualize antes de salvar.",
        );
      if (!Array.isArray(raw.songs) || raw.songs.length > 40)
        throw new AccountError(400, "Escolha até 40 músicas.");
      const songs = [];
      for (const [index, item] of raw.songs.entries()) {
        const id = documentId(item.songId, "Música"),
          [song] = await tx.read(`${root}/worshipSongs/${id}`);
        if (
          song?.organizationId !== orgId ||
          !validWorshipKey(item.selectedKey) ||
          song.originalKey?.endsWith("m") !== item.selectedKey.endsWith("m")
        )
          throw new AccountError(
            400,
            "Confira as músicas e os tons do repertório.",
          );
        songs.push({
          songId: id,
          selectedKey: item.selectedKey,
          sortOrder: index,
        });
      }
      const setlist = {
        id: eventId,
        eventId,
        organizationId: orgId,
        songs,
        updatedAt: now,
      };
      tx.set(path, setlist);
      tx.set(`${root}/worshipAudit/${crypto.randomUUID()}`, {
        organizationId: orgId,
        actorId: uid,
        action: raw.action,
        eventId,
        at: now,
      });
      return { setlist };
    }
    throw new AccountError(400, "Operação inválida.");
  });
}
