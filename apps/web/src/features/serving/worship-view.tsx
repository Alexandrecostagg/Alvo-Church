"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Music, Play, ExternalLink, HelpCircle, Save, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { transposeChordsText } from "@alvo/domain";
import type { WorshipSong, WorshipSetlist } from "@alvo/types";
import { MOCK_WORSHIP_SONGS, MOCK_WORSHIP_SETLISTS } from "../../lib/mock-data";

const CHROMATIC_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function WorshipView() {
  const [songs, setSongs] = useState<WorshipSong[]>(MOCK_WORSHIP_SONGS);
  const [selectedSongId, setSelectedSongId] = useState<string>("song_2");
  const [selectedKey, setSelectedKey] = useState<string>("D");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSong, setNewSong] = useState({
    title: "",
    artist: "",
    originalKey: "G",
    tempoBpm: "75",
    chordsLyrics: "",
    spotifyUrl: "",
    youtubeUrl: ""
  });

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
  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.title || !newSong.artist) return;

    const added: WorshipSong = {
      id: `song_${Date.now()}`,
      organizationId: "org_alvo_demo",
      title: newSong.title,
      artist: newSong.artist,
      originalKey: newSong.originalKey,
      tempoBpm: Number(newSong.tempoBpm) || undefined,
      spotifyUrl: newSong.spotifyUrl || undefined,
      youtubeUrl: newSong.youtubeUrl || undefined,
      chordsLyrics: newSong.chordsLyrics || "[A] Exemplo de cifra",
      createdAt: new Date().toISOString()
    };

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
    <main className="form-page serving-page animate-entrance">
      <section className="serving-hero" style={{ paddingBottom: "1.5rem" }}>
        <div>
          <Link className="back-link" href="/serving">
            <ArrowLeft size={14} style={{ marginRight: 6 }} />
            Voltar ao Ministério de Música
          </Link>
          <p className="eyebrow" style={{ color: "#8b5cf6" }}>Música & Adoração</p>
          <h1>Worship Setlists</h1>
          <p>
            Gerencie o repertório da igreja, transponha tons dinamicamente para os ministros e acesse links de streaming.
          </p>
        </div>
      </section>

      <section className="serving-workbench" style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "2rem" }}>
        {/* Painel Esquerdo: Repertório e Lista */}
        <aside className="serving-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center" }}>
            <p className="eyebrow">Repertório ativo</p>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                backgroundColor: "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              <Plus size={14} />
              Nova Música
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {songs.map(song => (
              <button
                key={song.id}
                onClick={() => handleSelectSong(song.id)}
                className={`volunteer-card ${selectedSongId === song.id ? "is-selected" : ""}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  backgroundColor: selectedSongId === song.id ? "rgba(139, 92, 246, 0.15)" : "rgba(30, 41, 59, 0.5)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{song.title}</strong>
                  <span style={{ fontSize: "0.75rem", backgroundColor: "#8b5cf6", padding: "2px 6px", borderRadius: 4 }}>
                    Tom: {song.originalKey}
                  </span>
                </div>
                <p style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: 4 }}>{song.artist}</p>
                {song.tempoBpm && (
                  <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>BPM: {song.tempoBpm}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Painel Direito: Cifra e Transposição */}
        <article className="serving-panel" style={{ minHeight: "600px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {showAddForm ? (
            <form onSubmit={handleAddSong} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Formulário de Cadastro</p>
                  <h2>Cadastrar Novo Louvor</h2>
                </div>
              </div>

              <div className="quick-group-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label>
                  Título do Louvor *
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

              <div className="quick-group-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label>
                  Tom Original *
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
                  BPM (Andamento)
                  <input
                    type="number"
                    value={newSong.tempoBpm}
                    onChange={e => setNewSong(c => ({ ...c, tempoBpm: e.target.value }))}
                    placeholder="Ex: 78"
                  />
                </label>
              </div>

              <div className="quick-group-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
                Letra Cifrada (Use colchetes para os acordes, ex: Deus en[G]viou Seu Filho a[C]mado)
                <textarea
                  rows={10}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "white",
                    padding: "1rem",
                    fontFamily: "monospace"
                  }}
                  value={newSong.chordsLyrics}
                  onChange={e => setNewSong(c => ({ ...c, chordsLyrics: e.target.value }))}
                  placeholder="[G] Deus enviou Seu Filho..."
                />
              </label>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button type="submit" className="primary-button" style={{ backgroundColor: "#8b5cf6" }}>
                  <Save size={16} />
                  Salvar no Repertório
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="ghost-button">
                  Cancelar
                </button>
              </div>
            </form>
          ) : selectedSong ? (
            <>
              {/* Cabeçalho do Louvor */}
              <div className="section-heading" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1rem" }}>
                <div>
                  <p className="eyebrow">{selectedSong.artist}</p>
                  <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>{selectedSong.title}</h2>
                  <div style={{ display: "flex", gap: "1rem", marginTop: 8 }}>
                    {selectedSong.spotifyUrl && (
                      <a href={selectedSong.spotifyUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", color: "#1db954" }}>
                        <Play size={14} />
                        Spotify
                      </a>
                    )}
                    {selectedSong.youtubeUrl && (
                      <a href={selectedSong.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", color: "#ff0000" }}>
                        <ExternalLink size={14} />
                        YouTube
                      </a>
                    )}
                    {selectedSong.tempoBpm && (
                      <span style={{ fontSize: "0.8rem", opacity: 0.5 }}> Andamento: {selectedSong.tempoBpm} BPM</span>
                    )}
                  </div>
                </div>

                {/* Transpositor Premium de Tons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8b5cf6" }}>TRANSPOSITOR DINÂMICO</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {CHROMATIC_SCALE.map(k => (
                      <button
                        key={k}
                        onClick={() => setSelectedKey(k)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: "none",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          backgroundColor: selectedKey === k ? "#8b5cf6" : "rgba(255,255,255,0.05)",
                          color: "white",
                          transition: "all 0.2s"
                        }}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>
                    Tom original: {selectedSong.originalKey} | Transposto em real-time
                  </span>
                </div>
              </div>

              {/* Corpo da Cifra Renderizada em Tempo Real */}
              <div
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "16px",
                  padding: "2rem",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
                  flex: 1,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  fontFamily: "JetBrains Mono, monospace"
                }}
              >
                <code style={{ fontSize: "1.1rem", lineHeight: "1.75rem", color: "#e2e8f0" }}>
                  {/* Destaca acordes em colchetes com cor roxa do tema de louvor */}
                  {transposedChordsLyrics.split("\n").map((line, idx) => {
                    // Regex para destacar [C#m7] etc
                    const parts = line.split(/(\[[^\]]+\])/g);
                    return (
                      <div key={idx} style={{ minHeight: "1.25rem" }}>
                        {parts.map((part, pIdx) => {
                          if (part.startsWith("[") && part.endsWith("]")) {
                            return (
                              <strong key={pIdx} style={{ color: "#a78bfa", fontWeight: 800 }}>
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
    </main>
  );
}
