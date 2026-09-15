'use client';

import { useState } from 'react';

const MAX = 500 * 1024 * 1024;
function sizeLabel(size: number) { return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`; }

async function upload(file: File) {
  if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) throw new Error('Use arquivos MP4.');
  if (!file.size || file.size > MAX) throw new Error('Cada vídeo deve ter no máximo 500 MB.');
  const response = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, type: 'video/mp4' }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível preparar o upload.');
  const put = await fetch(data.url, { method: 'PUT', headers: { 'content-type': 'video/mp4' }, body: file });
  if (!put.ok) throw new Error(`Falha no upload de ${file.name}.`);
  return data.key as string;
}

export default function Page() {
  const [reference, setReference] = useState<File | null>(null);
  const [source, setSource] = useState<File | null>(null);
  const [status, setStatus] = useState('Selecione os dois vídeos para começar.');
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function create() {
    if (!reference || !source || busy) return;
    setBusy(true); setError(''); setOutput(null); setProgress(8);
    try {
      setStatus('Enviando os vídeos com segurança...');
      const [referenceKey, sourceKey] = await Promise.all([upload(reference), upload(source)]);
      setProgress(24);
      const response = await fetch('/api/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reference: referenceKey, source: sourceKey, referenceSize: reference.size, sourceSize: source.size }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível criar o job.');
      setStatus('Analisando referência e vídeo fonte...'); setProgress(32);
      for (let i = 0; i < 4320; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const stateResponse = await fetch(`/api/jobs/${data.id}`, { cache: 'no-store' });
        if (!stateResponse.ok) continue;
        const state = await stateResponse.json();
        if (state.status === 'QUEUED') { setStatus('Na fila do worker gratuito...'); setProgress(Math.max(32, Math.min(48, 32 + i / 120))); }
        else if (state.status === 'RUNNING') { setStatus('Reconstruindo cortes, ritmo, movimento e aparência...'); setProgress(Math.max(48, Math.min(92, 48 + i / 120))); }
        else if (state.status === 'COMPLETED') { setOutput(state.output); setProgress(100); setStatus('Edit concluído. O vídeo final está pronto.'); return; }
        else if (state.status === 'FAILED' || state.status === 'CANCELED') throw new Error(state.error || `O job terminou com status ${state.status}.`);
      }
      throw new Error('O processamento demorou mais do que o limite de espera desta sessão. O job continua no servidor; tente consultar novamente.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro inesperado.'); setStatus('Não foi possível concluir o processamento.'); }
    finally { setBusy(false); }
  }

  const ready = Boolean(reference && source);
  return <main className="shell"><section className="card">
    <div className="eyebrow">IA • RECONSTRUÇÃO DE EDIÇÃO</div>
    <h1 className="title">EDIT-IA</h1>
    <p className="muted">Transforme um vídeo fonte para seguir a linguagem visual e temporal de um vídeo de referência.</p>
    <div className="grid">
      <label className="drop"><span className="dropTitle">01 · Vídeo A — referência</span><span className="dropHint">O EDIT-IA analisa cortes, ritmo, movimento e aparência.</span><input type="file" accept=".mp4,video/mp4" onChange={e => setReference(e.target.files?.[0] || null)} />{reference && <strong className="fileName">{reference.name} · {sizeLabel(reference.size)}</strong>}</label>
      <label className="drop"><span className="dropTitle">02 · Vídeo B — fonte</span><span className="dropHint">O EDIT-IA encontra os melhores momentos para reconstruir o estilo.</span><input type="file" accept=".mp4,video/mp4" onChange={e => setSource(e.target.files?.[0] || null)} />{source && <strong className="fileName">{source.name} · {sizeLabel(source.size)}</strong>}</label>
      <button className="btn" disabled={!ready || busy} onClick={create}>{busy ? 'PROCESSANDO...' : 'CRIAR EDIT'}</button>
    </div>
    {busy && <div className="progress" aria-label="Progresso"><div className="bar" style={{ width: `${progress}%` }} /></div>}
    <div className="status" aria-live="polite">{status}</div>
    {error && <div className="error" role="alert">{error}</div>}
    {output && <div className="result"><div><strong>Vídeo final pronto</strong><span>Processamento concluído pelo worker.</span></div><div className="actions"><a className="btn secondary" href={output} target="_blank" rel="noreferrer">ABRIR</a><a className="btn" href={output} download="editia-final.mp4">BAIXAR MP4</a></div></div>}
    <p className="footnote">Somente MP4 · até 500 MB por vídeo · o arquivo A é uma referência observável, não um projeto oculto de CapCut/After Effects.</p>
  </section></main>;
}
