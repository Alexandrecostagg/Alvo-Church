"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Music, Play, ExternalLink, Save } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { transposeChordsText } from "@alvo/domain";
import type { WorshipSong } from "@alvo/types";
import { MOCK_WORSHIP_SONGS } from "../../lib/mock-data";
import { useAppAuth } from "../../../app/providers";
import { fetchWorshipSongs, saveWorshipSong, isFirebaseWebRuntimeConfigured } from "@alvo/firebase";

const CHROMATIC_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function WorshipView() {
  const { configured, firebaseReady, user, organizationId, firebaseConfig } = useAppAuth();
  const [songs, setSongs] = useState<WorshipSong[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string>("song_2");
  const [selectedKey, setSelectedKey] = useState<string>("D");
  const [showAddForm, setShowAddForm] = useState(false);
  const [status, setStatus] = useState("Sincronizando com Firestore...");
  const [newSong, setNewSong] = useState({
    title: "",
    artist: "",
    originalKey: "G",
    tempoBpm: "75",
    chordsLyrics: "",
    spotifyUrl: "",
    youtubeUrl: ""
  });

  // Carrega e sincroniza músicas do Firestore
  useEffect(() => {
    if (!configured || !firebaseReady || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setSongs(MOCK_WORSHIP_SONGS);
      setStatus("Exibindo louvores de demonstração offline.");
      return;
    }

    let cancelled = false;

    async function loadSongs() {
      try {
        setStatus("Sincronizando com Firestore...");
        const dbSongs = await fetchWorshipSongs(firebaseConfig, { organizationId });
        if (cancelled) return;

        if (dbSongs.length === 0) {
          setStatus("Inicializando repertório padrão no Firestore...");
          // Seed mock songs
          await Promise.all(
            MOCK_WORSHIP_SONGS.map(async (song) => {
              const toSave = { ...song, organizationId };
              await saveWorshipSong(firebaseConfig, { organizationId }, toSave);
            })
          );
          if (cancelled) return;
          const freshSongs = await fetchWorshipSongs(firebaseConfig, { organizationId });
          if (cancelled) return;
          setSongs(freshSongs);
          setStatus("Repertório padrão inicializado.");
        } else {
          setSongs(dbSongs);
          setStatus("Repertório carregado.");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSongs(MOCK_WORSHIP_SONGS);
          setStatus("Erro ao conectar ao Firestore. Exibindo demonstração.");
        }
      }
    }

    void loadSongs();

    return () => {
      cancelled = true;
    };
  }, [configured, firebaseConfig, firebaseReady, organizationId, user]);

  const selectedSong = useMemo(() => {
    return songs.find(s => s.id === selectedSongId) ?? songs[0];
  }, [songs, selectedSongId]);

  // Sincroniza a chave selecionada com a tonalidade original do louvor selecionado
  const handleSelectSong = (songId: string) => {
    setSelectedSongId(songId);
    const targetSong = songs.find(s => s.id === songId);
    if (targetSong) {
      setSelectedKey(targetSong.originalKey);
    }
  };

  // Cifra transposta em tempo real usando o algoritmo de domínio
  const transposedChordsLyrics = useMemo(() => {
    if (!selectedSong) return "";
    return transposeChordsText(
      selectedSong.chordsLyrics ?? "",
      selectedSong.originalKey,
      selectedKey
    );
  }, [selectedSong, selectedKey]);

  // Trata submissão de nova música
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.title || !newSong.artist) return;

    const added: WorshipSong = {
      id: `song_${Date.now()}`,
      organizationId: organizationId || "org_alvo_demo",
      title: newSong.title,
      artist: newSong.artist,
      originalKey: newSong.originalKey,
      tempoBpm: Number(newSong.tempoBpm) || undefined,
      spotifyUrl: newSong.spotifyUrl || undefined,
      youtubeUrl: newSong.youtubeUrl || undefined,
      chordsLyrics: newSong.chordsLyrics || "[A] Exemplo de cifra",
      createdAt: new Date().toISOString()
    };

    // Salva no Firestore
    if (configured && firebaseReady && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Salvando no Firestore...");
      try {
        await saveWorshipSong(firebaseConfig, { organizationId }, added);
        setStatus("Música salva.");
      } catch (err) {
        console.error(err);
        setStatus("Erro ao salvar no Firestore. Salvo apenas localmente.");
      }
    }

    setSongs(current => [...current, added]);
    setSelectedSongId(added.id);
    setSelectedKey(added.originalKey);
    setShowAddForm(false);
    setNewSong({
      title: "",
      artist: "",
      originalKey: "G",
      tempoBpm: "75",
      chordsLyrics: "",
      spotifyUrl: "",
      youtubeUrl: ""
    });
  };

  return (
    <div className="page-root worship-page">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Louvor & Cifras</h1>
          <p className="page-subtitle">Repertório, transposição e preparação para o culto</p>
        </div>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: "var(--alvo-ink-soft)", background: "var(--alvo-surface-muted)", padding: "4px 10px", borderRadius: 8 }}>
            {configured && firebaseReady ? "Firestore conectado" : "Modo demonstração"}
          </span>
        </div>
      </header>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><Music size={20} /></div>
          <div className="stat-body"><span className="stat-label">Músicas no repertório</span><span className="stat-value">{songs.length}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--alvo-accent-soft)", color: "var(--alvo-accent-dark)" }}><Play size={20} /></div>
          <div className="stat-body"><span className="stat-label">Tom selecionado</span><span className="stat-value">{selectedKey}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Music size={20} /></div>
          <div className="stat-body"><span className="stat-label">Tom original</span><span className="stat-value">{selectedSong?.originalKey ?? "—"}</span></div>
        </div>
      </div>

      <section className="worship-workbench">
        <aside className="worship-panel worship-library">
          <div className="worship-panel-heading">
            <div>
              <p className="eyebrow">Repertório ativo</p>
              <h2>Biblioteca</h2>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="worship-primary-action"
              type="button"
            >
              <Plus size={16} />
              Nova Música
            </button>
          </div>

          <div className="worship-song-list">
            {songs.map(song => (
              <button
                key={song.id}
                onClick={() => handleSelectSong(song.id)}
                className={selectedSongId === song.id ? "worship-song-card is-selected" : "worship-song-card"}
                type="button"
              >
                <span>Tom {song.originalKey}</span>
                <strong>{song.title}</strong>
                <p>{song.artist}</p>
                {song.tempoBpm && <small>{song.tempoBpm} BPM</small>}
              </button>
            ))}
          </div>
        </aside>

        <article className="worship-panel worship-main-panel">
          {showAddForm ? (
            <form onSubmit={handleAddSong} className="worship-song-form">
              <div className="worship-panel-heading">
                <div>
                  <p className="eyebrow">Cadastro</p>
                  <h2>Cadastrar novo louvor</h2>
                </div>
              </div>

              <div className="worship-form-grid">
                <label>
                  Título do louvor *
                  <input
                    type="text"
                    required
                    value={newSong.title}
                    onChange={e => setNewSong(c => ({ ...c, title: e.target.value }))}
                    placeholder="Ex: A Ele a Glória"
                  />
                </label>
                <label>
                  Artista / Ministério *
                  <input
                    type="text"
                    required
                    value={newSong.artist}
                    onChange={e => setNewSong(c => ({ ...c, artist: e.target.value }))}
                    placeholder="Ex: Diante do Trono"
                  />
                </label>
              </div>

              <div className="worship-form-grid">
                <label>
                  Tom original *
                  <select
                    value={newSong.originalKey}
                    onChange={e => setNewSong(c => ({ ...c, originalKey: e.target.value }))}
                  >
                    {CHROMATIC_SCALE.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label>
                  BPM
                  <input
                    type="number"
                    value={newSong.tempoBpm}
                    onChange={e => setNewSong(c => ({ ...c, tempoBpm: e.target.value }))}
                    placeholder="Ex: 78"
                  />
                </label>
              </div>

              <div className="worship-form-grid">
                <label>
                  Link Spotify
                  <input
                    type="url"
                    value={newSong.spotifyUrl}
                    onChange={e => setNewSong(c => ({ ...c, spotifyUrl: e.target.value }))}
                    placeholder="https://open.spotify.com/..."
                  />
                </label>
                <label>
                  Link YouTube
                  <input
                    type="url"
                    value={newSong.youtubeUrl}
                    onChange={e => setNewSong(c => ({ ...c, youtubeUrl: e.target.value }))}
                    placeholder="https://youtube.com/..."
                  />
                </label>
              </div>

              <label>
                Letra cifrada
                <textarea
                  rows={12}
                  value={newSong.chordsLyrics}
                  onChange={e => setNewSong(c => ({ ...c, chordsLyrics: e.target.value }))}
                  placeholder="[G] Deus enviou Seu Filho..."
                />
                <small>Use acordes entre colchetes, como [G], [C#m7] ou [D/F#].</small>
              </label>

              <div className="worship-form-actions">
                <button type="submit" className="worship-primary-action">
                  <Save size={16} />
                  Salvar no repertório
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="worship-secondary-action">
                  Cancelar
                </button>
              </div>
            </form>
          ) : selectedSong ? (
            <>
              <div className="worship-song-header">
                <div>
                  <p className="eyebrow">{selectedSong.artist}</p>
                  <h2>{selectedSong.title}</h2>
                  <div className="worship-song-links">
                    {selectedSong.spotifyUrl && (
                      <a href={selectedSong.spotifyUrl} target="_blank" rel="noopener noreferrer">
                        <Play size={14} />
                        Spotify
                      </a>
                    )}
                    {selectedSong.youtubeUrl && (
                      <a href={selectedSong.youtubeUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} />
                        YouTube
                      </a>
                    )}
                    {selectedSong.tempoBpm && <span>{selectedSong.tempoBpm} BPM</span>}
                  </div>
                </div>

                <div className="worship-key-control">
                  <span>Transpositor</span>
                  <div className="worship-key-grid">
                    {CHROMATIC_SCALE.map(k => (
                      <button
                        key={k}
                        onClick={() => setSelectedKey(k)}
                        className={selectedKey === k ? "is-active" : ""}
                        type="button"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  <small>Tom original: {selectedSong.originalKey}</small>
                </div>
              </div>

              <div className="worship-chord-sheet">
                <code>
                  {transposedChordsLyrics.split("\n").map((line, idx) => {
                    const parts = line.split(/(\[[^\]]+\])/g);
                    return (
                      <div key={idx} className="worship-chord-line">
                        {parts.map((part, pIdx) => {
                          if (part.startsWith("[") && part.endsWith("]")) {
                            return (
                              <strong key={pIdx}>
                                {part}
                              </strong>
                            );
                          }
                          return part;
                        })}
                      </div>
                    );
                  })}
                </code>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>Nenhuma música selecionada</strong>
              <p>Escolha um louvor no repertório para exibir cifras.</p>
            </div>
          )}
        </article>
      </section>

      <style jsx>{`
        .worship-page {
          width: 100%;
          max-width: 1480px;
          margin: 0 auto;
          padding: 32px clamp(20px, 3vw, 44px) 56px;
          color: #111827;
          background:
            radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.08), transparent 28%),
            radial-gradient(circle at 92% 0%, rgba(22, 163, 74, 0.10), transparent 24%),
            linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%);
        }

        .worship-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
          gap: 24px;
          align-items: end;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.10);
        }

        .worship-hero .back-link,
        .worship-primary-action,
        .worship-secondary-action {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 850;
          text-decoration: none;
        }

        .worship-hero .back-link,
        .worship-secondary-action {
          padding: 0 18px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #334155;
          box-shadow: 0 8px 22px -18px rgba(15, 23, 42, 0.50);
        }

        .worship-hero .eyebrow,
        .worship-panel .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #ea580c;
          font-size: 13px;
          letter-spacing: 0.16em;
        }

        .worship-hero h1 {
          max-width: 980px;
          margin: 10px 0 12px;
          color: #111827;
          font-size: clamp(44px, 4.5vw, 64px);
          line-height: 0.98;
          letter-spacing: 0;
        }

        .worship-hero p:not(.eyebrow) {
          max-width: 920px;
          margin: 0;
          color: #1f2937;
          font-size: clamp(17px, 1.25vw, 20px);
          line-height: 1.55;
        }

        .worship-status-card,
        .worship-kpis article,
        .worship-panel {
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 44px -30px rgba(15, 23, 42, 0.45);
        }

        .worship-status-card {
          padding: 20px;
        }

        .worship-status-card strong {
          display: block;
          margin: 10px 0 6px;
          color: #111827;
          font-size: 18px;
        }

        .worship-status-card p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.35;
        }

        .worship-kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }

        .worship-kpis article {
          min-height: 126px;
          padding: 22px;
        }

        .worship-kpis span {
          color: #475569;
          font-size: 14px;
          font-weight: 750;
        }

        .worship-kpis strong {
          display: block;
          margin-top: 10px;
          color: #0891b2;
          font-size: 38px;
          line-height: 1;
        }

        .worship-kpis article:nth-child(2) strong {
          color: #ea580c;
        }

        .worship-kpis article:nth-child(3) strong {
          color: #16a34a;
        }

        .worship-kpis p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .worship-workbench {
          display: grid;
          grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        .worship-panel {
          padding: 24px;
        }

        .worship-library {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .worship-main-panel {
          min-height: 640px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .worship-panel-heading,
        .worship-song-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .worship-panel-heading h2,
        .worship-song-header h2 {
          margin: 6px 0 0;
          color: #111827;
          font-size: clamp(26px, 2.5vw, 36px);
          line-height: 1.1;
          letter-spacing: 0;
        }

        .worship-primary-action {
          padding: 0 18px;
          border: 0;
          background: #ea580c;
          color: #ffffff;
          box-shadow: 0 12px 24px -16px rgba(234, 88, 12, 0.70);
          white-space: nowrap;
        }

        .worship-song-list {
          display: grid;
          gap: 12px;
        }

        .worship-song-card {
          width: 100%;
          min-height: 112px;
          padding: 16px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 14px;
          background: #f8fafc;
          color: #111827;
          text-align: left;
          transition: all 0.18s ease;
        }

        .worship-song-card:hover,
        .worship-song-card.is-selected {
          border-color: rgba(8, 145, 178, 0.32);
          background: #ecfeff;
          transform: translateY(-1px);
        }

        .worship-song-card span {
          display: inline-flex;
          padding: 3px 8px;
          border-radius: 999px;
          background: #ffffff;
          color: #0891b2;
          font-size: 12px;
          font-weight: 900;
        }

        .worship-song-card strong {
          display: block;
          margin-top: 10px;
          color: #111827;
          font-size: 17px;
          line-height: 1.2;
        }

        .worship-song-card p,
        .worship-song-card small {
          color: #64748b;
        }

        .worship-song-card p {
          margin: 5px 0 0;
          font-size: 14px;
        }

        .worship-song-card small {
          display: block;
          margin-top: 8px;
          font-size: 12px;
          font-weight: 800;
        }

        .worship-song-links {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
        }

        .worship-song-links a,
        .worship-song-links span {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          border-radius: 999px;
          background: #f8fafc;
          color: #334155;
          border: 1px solid rgba(15, 23, 42, 0.10);
          font-size: 13px;
          font-weight: 850;
        }

        .worship-key-control {
          min-width: 260px;
          padding: 14px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 14px;
          background: #f8fafc;
        }

        .worship-key-control > span {
          color: #ea580c;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .worship-key-control small {
          display: block;
          margin-top: 10px;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
        }

        .worship-key-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 6px;
          margin-top: 10px;
        }

        .worship-key-grid button {
          min-height: 34px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 8px;
          background: #ffffff;
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        .worship-key-grid button.is-active {
          border-color: #ea580c;
          background: #ea580c;
          color: #ffffff;
        }

        .worship-chord-sheet {
          flex: 1;
          overflow: auto;
          padding: 24px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 16px;
          background: #fffdf8;
          box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.03);
        }

        .worship-chord-sheet code {
          display: block;
          color: #1f2937;
          font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 17px;
          line-height: 1.85;
          white-space: pre-wrap;
        }

        .worship-chord-line {
          min-height: 1.4em;
        }

        .worship-chord-line strong {
          color: #0891b2;
          font-weight: 950;
        }

        .worship-song-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .worship-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .worship-song-form label {
          color: #111827;
          font-size: 14px;
          font-weight: 850;
        }

        .worship-song-form input,
        .worship-song-form select,
        .worship-song-form textarea {
          width: 100%;
          margin-top: 8px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 10px;
          background: #ffffff;
          color: #111827;
          font-size: 15px;
          outline: none;
        }

        .worship-song-form input,
        .worship-song-form select {
          min-height: 46px;
          padding: 0 14px;
        }

        .worship-song-form textarea {
          padding: 14px;
          font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          line-height: 1.55;
          resize: vertical;
        }

        .worship-song-form input:focus,
        .worship-song-form select:focus,
        .worship-song-form textarea:focus {
          border-color: #0891b2;
          box-shadow: 0 0 0 4px rgba(8, 145, 178, 0.12);
        }

        .worship-song-form label small {
          display: block;
          margin-top: 8px;
          color: #64748b;
          font-size: 13px;
        }

        .worship-form-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }

        @media (max-width: 1100px) {
          .worship-hero,
          .worship-workbench {
            grid-template-columns: 1fr;
          }

          .worship-status-card {
            max-width: none;
          }
        }

        @media (max-width: 720px) {
          .worship-page {
            padding: 24px 16px 40px;
          }

          .worship-hero h1 {
            font-size: 42px;
          }

          .worship-kpis,
          .worship-form-grid {
            grid-template-columns: 1fr;
          }

          .worship-panel-heading,
          .worship-song-header {
            flex-direction: column;
            align-items: stretch;
          }

          .worship-key-control {
            min-width: 0;
          }

          .worship-primary-action,
          .worship-secondary-action {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
