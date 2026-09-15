'use client';
import { useState } from 'react';

async function upload(f: File) {
  const a = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: f.name, size: f.size, type: f.type })
  });
  const j = await a.json();
  if (!a.ok) throw new Error(j.error || 'Upload setup failed');
  const r = await fetch(j.url, {
    method: 'PUT',
    headers: { 'content-type': f.type || 'video/mp4' },
    body: f
  });
  if (!r.ok) throw new Error('Video upload failed');
  return j.key;
}

export default function Page() {
  const [a, setA] = useState<File | null>(null);
  const [b, setB] = useState<File | null>(null);
  const [status, setStatus] = useState('Pronto para criar o edit.');
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!a || !b) return;
    setBusy(true);
    setOutput(null);
    try {
      setStatus('Enviando vídeos para armazenamento seguro...');
      const [ak, bk] = await Promise.all([upload(a), upload(b)]);

      setStatus('Job colocado na fila gratuita do EDIT-IA...');
      const r = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference: ak, source: bk, referenceSize: a.size, sourceSize: b.size })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erro ao criar job');

      setStatus(`Job ${j.id}\nAguardando o worker...`);
      for (let i = 0; i < 2160; i++) {
        await new Promise(x => setTimeout(x, 5000));
        const s = await fetch(`/api/jobs/${j.id}`, { cache: 'no-store' });
        if (!s.ok) continue;
        const d = await s.json();
        setStatus(`Job ${j.id}\nStatus: ${d.status}`);
        if (d.output) setOutput(d.output);
        if (d.status === 'COMPLETED') {
          setStatus(`Job ${j.id}\nConcluído. O vídeo está pronto.`);
          break;
        }
        if (d.status === 'FAILED' || d.status === 'CANCELED') {
          throw new Error(d.error || `Job ${d.status}`);
        }
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Erro inesperado');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="card">
        <h1 className="title">EDIT-IA</h1>
        <p className="muted">Reconstrução automática do estilo de edição.</p>
        <div className="grid">
          <label className="drop">Vídeo A — referência<input type="file" accept="video/mp4,video/*" onChange={e => setA(e.target.files?.[0] || null)} /></label>
          <label className="drop">Vídeo B — vídeo fonte<input type="file" accept="video/mp4,video/*" onChange={e => setB(e.target.files?.[0] || null)} /></label>
          <button className="btn" disabled={!a || !b || busy} onClick={create}>{busy ? 'PROCESSANDO...' : 'CRIAR EDIT'}</button>
        </div>
        <div className="status">{status}</div>
        {output && <a className="btn" href={output} target="_blank" rel="noreferrer">ABRIR VÍDEO FINAL</a>}
      </section>
    </main>
  );
}
