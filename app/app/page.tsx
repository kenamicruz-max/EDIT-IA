'use client';

import { useEffect, useState } from 'react';

const MAX = 500 * 1024 * 1024;
const SESSION_LIMIT_MS = 6 * 60 * 60 * 1000;
const JOB_KEY = 'editia:last-job-id';
function sizeLabel(size: number) { return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`; }
function stageLabel(stage: string | null, status: string | null) {
  if (status === 'QUEUED') return 'Na fila do worker gratuito — aguardando processamento...';
  if (status === 'COMPLETED') return 'Edit concluído. O vídeo final está pronto.';
  if (status === 'FAILED' || status === 'CANCELED') return 'O processamento terminou com erro.';
  const labels: Record<string, string> = {
    STARTING: 'Iniciando o worker...', DOWNLOADING: 'Baixando os vídeos para processamento...',
    ANALYZING: 'Analisando referência e vídeo fonte...', AUDIO_REFERENCE: 'Analisando áudio da referência...',
    VIDEO_REFERENCE: 'Analisando vídeo da referência...', AUDIO_SOURCE: 'Analisando áudio do vídeo fonte...',
    VIDEO_SOURCE: 'Analisando vídeo fonte...', REFERENCE_EFFECTS: 'Analisando efeitos da referência...',
    SOURCE_EFFECTS: 'Analisando efeitos do vídeo fonte...', REFERENCE_TRANSITIONS: 'Analisando transições da referência...',
    SOURCE_TRANSITIONS: 'Analisando transições do vídeo fonte...', REFERENCE_TEXT: 'Analisando textos e overlays da referência...',
    SOURCE_TEXT: 'Analisando textos e overlays do vídeo fonte...', REFERENCE_VISION: 'Analisando composição e visão da referência...',
    SOURCE_VISION: 'Analisando composição e visão do vídeo fonte...', REFERENCE_COLOR: 'Analisando cor da referência...',
    SOURCE_COLOR: 'Analisando cor do vídeo fonte...', REFERENCE_MOTION: 'Analisando movimento da referência...',
    SOURCE_MOTION: 'Analisando movimento do vídeo fonte...', MASTER_SPEC: 'Construindo a especificação do edit...',
    COLOR_MATCH: 'Comparando e ajustando o look...', SOURCE_MATCH: 'Encontrando os melhores momentos do vídeo fonte...',
    RENDER: 'Renderizando o edit...', QC: 'Verificando o resultado...', AUTOCORRECT: 'Aplicando correções automáticas...',
    QC_PASSED: 'Controle de qualidade aprovado.', QC_ACCEPTED: 'Controle de qualidade concluído.', UPLOADING: 'Enviando o MP4 final...'
  };
  return labels[stage || ''] || 'Processando o edit...';
}

async function upload(file: File) {
  if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) throw new Error('Use arquivos MP4.');
  if (!file.size || file.size > MAX) throw new Error('Cada vídeo deve ter no máximo 500 MB.');
  const response = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, type: 'video/mp4' }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Não foi possível preparar o upload de ${file.name}.`);
  if (!data.url || !data.key) throw new Error(`O servidor não devolveu os dados de upload para ${file.name}.`);
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

  async function pollJob(id: string, maxWait = SESSION_LIMIT_MS) {
    const started = Date.now();
    let consecutiveStatusErrors = 0;
    while (Date.now() - started < maxWait) {
      const stateResponse = await fetch(`/api/jobs/${id}`, { cache: 'no-store' });
      if (!stateResponse.ok) {
        const body = await stateResponse.json().catch(() => ({}));
        if (stateResponse.status === 404) {
          localStorage.removeItem(JOB_KEY);
          throw new Error(body.error || 'O job não foi encontrado na fila.');
        }
        consecutiveStatusErrors += 1;
        setStatus(`Aguardando resposta do servidor... (${consecutiveStatusErrors}/3)`);
        if (consecutiveStatusErrors >= 3) throw new Error(body.error || 'Não foi possível consultar o estado do processamento.');
      } else {
        consecutiveStatusErrors = 0;
        const state = await stateResponse.json();
        const serverProgress = Number(state.progress);
        if (Number.isFinite(serverProgress)) setProgress(Math.max(3, Math.min(100, serverProgress)));
        setStatus(state.detail || stageLabel(state.stage, state.status));
        if (state.status === 'COMPLETED') {
          localStorage.removeItem(JOB_KEY);
          setOutput(state.output);
          setProgress(100);
          setStatus('Edit concluído. O vídeo final está pronto.');
          return true;
        }
        if (state.status === 'FAILED' || state.status === 'CANCELED') {
          localStorage.removeItem(JOB_KEY);
          throw new Error(state.error || `O job terminou com status ${state.status}.`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    return false;
  }

  useEffect(() => {
    const id = localStorage.getItem(JOB_KEY);
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        setBusy(true);
        setStatus('Recuperando o último processamento...');
        const done = await pollJob(id);
        if (alive && !done) setStatus('O job continua no servidor. Atualize a página para consultar novamente.');
      } catch (e) {
        if (alive) { setError(e instanceof Error ? e.message : 'Não foi possível recuperar o job.'); setStatus('Não foi possível recuperar o processamento.'); }
      } finally { if (alive) setBusy(false); }
    })();
    return () => { alive = false; };
  }, []);

  async function create() {
    if (!reference || !source || busy) return;
    setBusy(true); setError(''); setOutput(null); setProgress(2);
    try {
      setStatus('Enviando os vídeos com segurança...');
      const [referenceKey, sourceKey] = await Promise.all([upload(reference), upload(source)]);
      setProgress(3);
      const response = await fetch('/api/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reference: referenceKey, source: sourceKey, referenceSize: reference.size, sourceSize: source.size }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.id) throw new Error(data.error || 'Não foi possível criar o job.');
      localStorage.setItem(JOB_KEY, data.id);
      setStatus('Job criado. Aguardando o worker...');
      const done = await pollJob(data.id);
      if (!done) throw new Error('Esta sessão deixou de esperar pelo job. O processamento continua no servidor; atualize a página para consultar novamente.');
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
