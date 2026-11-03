import type { Analysis, CaseRecord, Citation, Procedure } from './types'
import corpus from './data/legal_corpus.json'
import guideTemplates from './data/procedures.json'

// Browser-only encrypted case vault. The server never receives the passphrase,
// original documents, case descriptions, or decrypted vault contents.
const DB_NAME = 'pramaan-vault-encrypted-v1'
const DB_STORE = 'records'
const RECORD_KEY = 'vault'
const ITERATIONS = 310_000
const MAX_FILE_BYTES = 5 * 1024 * 1024

export type StoredEvidence = {
  id: string; case_id: string; filename: string; media_type: string
  sha256: string; created_at: string; metadata_json: string; data_b64: string
}
export type StoredDraft = {
  id: string; case_id: string; title: string; document_type: string
  content: string; created_at: string
}
type Run = Procedure & { case_id: string; run_id: string }
type VaultData = {
  version: number
  cases: CaseRecord[]
  evidence: StoredEvidence[]
  drafts: StoredDraft[]
  runs: Run[]
  analyses: Record<string, Analysis>
  events: Array<{ id: string; case_id: string; action: string; created_at: string }>
}
type EncryptedRecord = {
  format: 'pramaan-aes256-gcm-v1'; iterations: number
  salt: string; iv: string; ciphertext: string
}

let key: CryptoKey | null = null
let data: VaultData | null = null
let salt: Uint8Array | null = null
let writeQueue: Promise<unknown> = Promise.resolve()

const initial = (): VaultData => ({
  version: 1, cases: [], evidence: [], drafts: [], runs: [], analyses: {}, events: []
})
const now = () => new Date().toISOString()
const rand = () => crypto.randomUUID()

function base64(bytes: Uint8Array): string {
  let raw = ''
  for (let i = 0; i < bytes.length; i += 16384) {
    raw += String.fromCharCode(...bytes.subarray(i, i + 16384))
  }
  return btoa(raw)
}
function unbase64(value: string): Uint8Array {
  const raw = atob(value)
  return Uint8Array.from(raw, x => x.charCodeAt(0))
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Cannot open encrypted browser storage.'))
    req.onblocked = () => reject(new Error('Close other tabs using this vault, then retry.'))
  })
}
async function getRecord(): Promise<EncryptedRecord | undefined> {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly')
      const req = tx.objectStore(DB_STORE).get(RECORD_KEY)
      req.onsuccess = () => resolve(req.result as EncryptedRecord | undefined)
      req.onerror = () => reject(req.error)
    })
  } finally { db.close() }
}
async function putRecord(record: EncryptedRecord): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).put(record, RECORD_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('Browser storage failed; nothing was saved.'))
      tx.onabort = () => reject(tx.error || new Error('Browser storage full or blocked.'))
    })
  } finally { db.close() }
}
async function derive(password: string, randomSalt: Uint8Array): Promise<CryptoKey> {
  const secret = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey({
    name: 'PBKDF2', salt: randomSalt, iterations: ITERATIONS, hash: 'SHA-256'
  }, secret, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
async function encrypt(snapshot: VaultData, cipherKey: CryptoKey, randomSalt: Uint8Array): Promise<EncryptedRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot))
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cipherKey, bytes)
  return {
    format: 'pramaan-aes256-gcm-v1', iterations: ITERATIONS,
    salt: base64(randomSalt), iv: base64(iv),
    ciphertext: base64(new Uint8Array(sealed))
  }
}
async function decrypt(record: EncryptedRecord, cipherKey: CryptoKey): Promise<VaultData> {
  if (record.format !== 'pramaan-aes256-gcm-v1' || record.iterations !== ITERATIONS) {
    throw new Error('Unsupported backup format.')
  }
  const bytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unbase64(record.iv) },
    cipherKey, unbase64(record.ciphertext)
  )
  const value = JSON.parse(new TextDecoder().decode(bytes)) as VaultData
  if (value.version !== 1 || !Array.isArray(value.cases) || !Array.isArray(value.evidence)) {
    throw new Error('Backup data is invalid.')
  }
  return value
}
function notify() { window.dispatchEvent(new Event('pramaan-vault-changed')) }
function unlocked(): VaultData {
  if (!data || !key || !salt) throw new Error('Unlock your encrypted case vault first.')
  return data
}
function requireCase(snapshot: VaultData, caseId: string): CaseRecord {
  const record = snapshot.cases.find(x => x.id === caseId)
  if (!record) throw new Error('Case not found in this browser vault.')
  return record
}
async function mutate<T>(fn: (next: VaultData) => T): Promise<T> {
  const work = async () => {
    const before = unlocked()
    const next = structuredClone(before)
    const result = fn(next)
    await putRecord(await encrypt(next, key!, salt!))
    data = next
    notify()
    return result
  }
  const result = writeQueue.then(work, work)
  writeQueue = result.catch(() => undefined)
  return result
}
export function isVaultUnlocked() { return Boolean(key && data && salt) }
export async function vaultExists() { return Boolean(await getRecord()) }
export function subscribeVault(listener: () => void): () => void {
  window.addEventListener('pramaan-vault-changed', listener)
  return () => window.removeEventListener('pramaan-vault-changed', listener)
}
export async function createVault(password: string): Promise<void> {
  if (password.length < 12) throw new Error('Choose a passphrase of at least 12 characters.')
  if (await vaultExists()) throw new Error('A vault already exists. Unlock it or import a backup.')
  const nextSalt = crypto.getRandomValues(new Uint8Array(16))
  const nextKey = await derive(password, nextSalt)
  const next = initial()
  await putRecord(await encrypt(next, nextKey, nextSalt))
  key = nextKey; salt = nextSalt; data = next
  if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false)
  notify()
}
export async function unlockVault(password: string): Promise<void> {
  const record = await getRecord()
  if (!record) throw new Error('No vault found in this browser. Create one or import a backup.')
  const nextSalt = unbase64(record.salt)
  const nextKey = await derive(password, nextSalt)
  try {
    const next = await decrypt(record, nextKey)
    key = nextKey; salt = nextSalt; data = next
    notify()
  } catch {
    throw new Error('Incorrect passphrase or damaged backup. No data was changed.')
  }
}
export function lockVault(): void {
  key = null; salt = null; data = null
  notify()
}
export async function exportEncryptedBackup(): Promise<void> {
  unlocked()
  const record = await getRecord()
  if (!record) throw new Error('Vault not found.')
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
  downloadBlob(blob, 'pramaan-encrypted-backup-' + new Date().toISOString().slice(0, 10) + '.json')
}
export async function importEncryptedBackup(file: File, password: string): Promise<void> {
  if (file.size > 100 * 1024 * 1024) throw new Error('Backup file is too large.')
  const record = JSON.parse(await file.text()) as EncryptedRecord
  const nextSalt = unbase64(record.salt)
  const nextKey = await derive(password, nextSalt)
  const next = await decrypt(record, nextKey)
  await putRecord(record)
  key = nextKey; salt = nextSalt; data = next
  notify()
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 20_000)
}

export function listCases(): Promise<CaseRecord[]> {
  return Promise.resolve([...unlocked().cases].sort((a,b) => b.updated_at.localeCompare(a.updated_at)))
}
export function readCase(id: string): Promise<CaseRecord> {
  const state = unlocked()
  const record = requireCase(state, id)
  const related = {
    evidence: state.evidence.filter(x => x.case_id === id).map(({ data_b64: _content, ...e }) => e),
    drafts: state.drafts.filter(x => x.case_id === id).map(({ content: _content, ...d }) => d),
    audit_events: state.events.filter(x => x.case_id === id)
  }
  return Promise.resolve({ ...record, related })
}
export function addCase(input: Omit<CaseRecord, 'id' | 'status' | 'revision' | 'created_at' | 'updated_at'>): Promise<CaseRecord> {
  if (!input.title.trim() || !input.description.trim()) return Promise.reject(new Error('Title and description are required.'))
  return mutate(next => {
    const created: CaseRecord = {
      ...input, id: rand(), status: 'new', revision: 0,
      created_at: now(), updated_at: now()
    }
    next.cases.unshift(created)
    next.events.push({id: rand(), case_id: created.id, action:'case.created',created_at:now()})
    return created
  })
}
export function editCase(id: string, patch: { title: string; description: string; jurisdiction: string; expected_revision: number }): Promise<CaseRecord> {
  return mutate(next => {
    const record = requireCase(next,id)
    if (record.revision !== patch.expected_revision) throw new Error('Case was changed by another tab; reload and retry.')
    if (!patch.title.trim() || !patch.description.trim()) throw new Error('Case cannot be blank.')
    Object.assign(record, {title:patch.title,description:patch.description,jurisdiction:patch.jurisdiction,revision:record.revision+1,updated_at:now()})
    delete next.analyses[id]
    next.events.push({id:rand(),case_id:id,action:'case.updated',created_at:now()})
    return record
  })
}
export function removeCase(id:string): Promise<void> {
  return mutate(next => {
    requireCase(next,id)
    next.cases = next.cases.filter(c=>c.id!==id)
    next.evidence = next.evidence.filter(e=>e.case_id!==id)
    next.drafts = next.drafts.filter(d=>d.case_id!==id)
    next.runs = next.runs.filter(r=>r.case_id!==id)
    next.events = next.events.filter(e=>e.case_id!==id)
    delete next.analyses[id]
  })
}

export function saveEvidence(caseId:string,file:File): Promise<{id:string;filename:string;stored_locally:boolean;vision_status:string}> {
  if(file.size > MAX_FILE_BYTES) return Promise.reject(new Error('Files are limited to 5 MB in the browser vault.'))
  return (async()=>{
    requireCase(unlocked(),caseId)
    const buffer=await file.arrayBuffer()
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))
    const sha256=Array.from(hash).map(b=>b.toString(16).padStart(2,'0')).join('')
    const id=rand(),filename=(file.name||'evidence').slice(0,180)
    await mutate(next=>{
      requireCase(next,caseId)
      next.evidence.push({
        id,case_id:caseId,filename,media_type:file.type||'application/octet-stream',
        sha256,created_at:now(),data_b64:base64(new Uint8Array(buffer)),
        metadata_json:JSON.stringify({stored_locally:true,parser:'not-extracted',vision_status:'Encrypted original stored in browser only'})
      })
      delete next.analyses[caseId]
      next.events.push({id:rand(),case_id:caseId,action:'evidence.added',created_at:now()})
    })
    return {id,filename,stored_locally:true,vision_status:'Encrypted original saved in this browser'}
  })()
}
export function downloadEvidence(caseId:string,evidenceId:string):void {
  const s=unlocked()
  requireCase(s,caseId)
  const item=s.evidence.find(x=>x.id===evidenceId&&x.case_id===caseId)
  if(!item)throw new Error('Evidence file not found.')
  const bytes=unbase64(item.data_b64)
  downloadBlob(new Blob([bytes],{type:item.media_type}),item.filename)
}

const DRAFT_TITLES:Record<string,string>={
  legal_notice:'LEGAL NOTICE',fir_complaint:'POLICE COMPLAINT',
  rti_application:'RIGHT TO INFORMATION APPLICATION',
  consumer_complaint:'CONSUMER COMPLAINT'
}
export function addDraft(caseId:string,input:{document_type:string;recipient:string;requested_relief:string}):Promise<StoredDraft>{
  return mutate(next=>{
    const c=requireCase(next,caseId)
    const title=DRAFT_TITLES[input.document_type]
    if(!title)throw new Error('Unknown document type.')
    if(!input.recipient.trim()||!input.requested_relief.trim())throw new Error('Recipient and relief required.')
    const content=[
      title,'','To:',input.recipient.trim(),'','Subject: '+c.title,
      'Jurisdiction: '+c.jurisdiction,'','Sir/Madam,','',
      'I submit the following facts for your consideration:','',
      c.description,'','In view of the above, I respectfully request:','',
      input.requested_relief,'',
      'The information above was taken only from the local case record, not independently verified. Check names, dates, jurisdiction, applicable law and requested relief with a qualified professional before use.',
      '','Date: ____________________','Place: '+c.jurisdiction,
      '','Signature: ____________________','Name: _________________________'
    ].join('\n')
    const draft:StoredDraft={id:rand(),case_id:caseId,title,document_type:input.document_type,content,created_at:now()}
    next.drafts.push(draft)
    next.events.push({id:rand(),case_id:caseId,action:'draft.created',created_at:now()})
    return draft
  })
}
export async function downloadDraftPdf(draftId:string):Promise<void>{
  const d=unlocked().drafts.find(x=>x.id===draftId)
  if(!d)throw new Error('Draft not found.')
  if(/[\u0900-\u097f]/.test(d.content)){
    // Browser-native print preserves Hindi glyphs. Users may Save as PDF.
    const popup=window.open('','_blank')
    if(!popup)throw new Error('Allow popups to print this Hindi draft as PDF.')
    const escape=(s:string)=>s.replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]||x))
    popup.document.write('<!doctype html><html><head><title>'+escape(d.title)+'</title><style>body{margin:2cm;font:12pt system-ui;white-space:pre-wrap}</style></head><body>'+escape(d.content)+'</body></html>')
    popup.document.close();popup.focus();popup.print()
    return
  }
  // Minimal, entirely local PDF writer for English case documents.
  // Does not load any third-party library or transmit content to a server.
  const plain=d.content
    .replace(/[\u2018\u2019]/g,"'")
    .replace(/[\u201c\u201d]/g,'"')
    .replace(/[\u2013\u2014]/g,'-')
    .replace(/₹/g,'Rs ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\x20-\x7e\n]/g,'?')
  const rows:string[]=[]
  for(const row of plain.split('\n')){
    const words=row.split(/\s+/)
    if(!row.trim()){rows.push('');continue}
    let current=''
    for(const word of words){
      if(!word)continue
      if(current.length && (current.length+word.length+1)>88){
        rows.push(current);current=''
      }
      if(word.length>88){
        if(current){rows.push(current);current=''}
        for(let j=0;j<word.length;j+=88)rows.push(word.slice(j,j+88))
      }else current+=(current?' ':'')+word
    }
    if(current)rows.push(current)
  }
  const pageRows:string[][]=[]
  for(let i=0;i<rows.length;i+=53)pageRows.push(rows.slice(i,i+53))
  if(!pageRows.length)pageRows.push([])
  const objects:string[]=[]
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>'
  const pageRefs=pageRows.map((_,i)=>(4+i*2)+' 0 R').join(' ')
  objects[2]='<< /Type /Pages /Kids [ '+pageRefs+' ] /Count '+pageRows.length+' >>'
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  const quote=(x:string)=>x.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')
  for(let i=0;i<pageRows.length;i++){
    const pageId=4+i*2,streamId=pageId+1
    const operations='BT /F1 10 Tf 48 786 Td 13 TL\n'
      +pageRows[i].map(line=>'('+quote(line)+') Tj T*').join('\n')+'\nET'
    objects[pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents '+streamId+' 0 R >>'
    objects[streamId]='<< /Length '+operations.length+' >>\nstream\n'+operations+'\nendstream'
  }
  let out='%PDF-1.4\n'
  const offsets:number[]=[0]
  for(let i=1;i<objects.length;i++){
    offsets[i]=out.length
    out+=i+' 0 obj\n'+objects[i]+'\nendobj\n'
  }
  const xref=out.length
  out+='xref\n0 '+objects.length+'\n0000000000 65535 f \n'
  for(let i=1;i<objects.length;i++)out+=offsets[i].toString().padStart(10,'0')+' 00000 n \n'
  out+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n'
  downloadBlob(new Blob([out],{type:'application/pdf'}),'pramaan-'+d.document_type+'-'+d.id.slice(0,8)+'.pdf')
}

export const templates=guideTemplates as Procedure[]
export function startGuide(caseId:string,procedureId:string):Promise<Procedure>{
  return mutate(next=>{
    requireCase(next,caseId)
    const template=templates.find(x=>x.id===procedureId)
    if(!template)throw new Error('Unknown action guide.')
    const run:Run={...structuredClone(template),run_id:rand(),case_id:caseId,progress:0,steps:template.steps.map(s=>({...s,completed:false}))}
    next.runs.push(run)
    return run
  })
}
export function markGuideStep(runId:string,stepId:string,done:boolean):Promise<Procedure>{
  return mutate(next=>{
    const run=next.runs.find(x=>x.run_id===runId)
    if(!run)throw new Error('Saved guide not found.')
    const step=run.steps.find(x=>x.id===stepId)
    if(!step)throw new Error('Guide step not found.')
    step.completed=done
    run.progress=Math.round(run.steps.filter(s=>s.completed).length/run.steps.length*100)
    return run
  })
}

type LocalLaw=typeof corpus[number]
const laws=corpus as LocalLaw[]
const tokenize=(text:string)=>text.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[]
export function searchLocalLaws(question:string,limit=5):Citation[]{
  const words=[...new Set(tokenize(question))]
  if(!words.length)return []
  const ranked=laws.map((law)=>{
    const terms=tokenize([law.act,law.section,law.title,law.text,law.keywords,law.jurisdiction].join(' '))
    const termSet=new Set(terms)
    const overlaps=words.reduce((n,w)=>n+(termSet.has(w)?1:0),0)
    const score=words.length?overlaps/words.length:0
    return {law,score}
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit)
  return ranked.map(({law,score})=>({
    id:law.id,act:law.act,section:law.section,title:law.title,
    text:law.text,jurisdiction:law.jurisdiction,source_url:law.source_url,
    relevance:Math.round(score*100),support_level:'contextual'
  }))
}
export function localAnalysis(caseId:string,question:string):Promise<Analysis>{
  return mutate(next=>{
    requireCase(next,caseId)
    if(!question.trim())throw new Error('Enter a legal research question.')
    const sources=searchLocalLaws(question)
    const answer=sources.length
      ? 'The following provisions appear relevant to your question according to the small local corpus. These matches are not a finding about your case:\n\n'
        +sources.map((c,i)=>(i+1)+'. '+c.act+' — '+c.section+': '+c.text).join('\n\n')
      : 'The small local corpus does not contain enough matching material for this question. Seek assistance from a qualified advocate or legal aid office.'
    const result:Analysis={
      intent:{domain:'general',issue:'source_search',confidence:0},
      answer:answer+'\n\nThis is general legal information from an unverified educational corpus, not advice from a lawyer.',
      next_steps:[
        'Check the current official text and effective dates of the cited provisions.',
        'Review your own documents and factual timeline; they were not checked by this search.',
        'Seek qualified legal advice before filing a notice or complaint.'
      ],
      citations:sources,
      guardrails:{allowed:true,legal_topic:true,injection_detected:false,masked_text:'[Local query — never sent to a server]',pii_types:[],findings:[]},
      trust_report:{
        score:0,citation_coverage:0,grounding_score:0,pii_safe:true,disclaimer_present:true,
        findings:['Source matches are not independently validated legal advice.','No case documents were analysed.','No generative AI was used.']
      },
      model_mode:'offline-source-search'
    }
    next.analyses[caseId]=result
    return result
  })
}
export function getSavedAnalysis(caseId:string|null):Analysis|null{
  return caseId&&data?.analyses[caseId]||null
}
export function saveAnalysis(caseId:string,analysis:Analysis):Promise<void>{
  return mutate(next=>{requireCase(next,caseId);next.analyses[caseId]=analysis})
}
