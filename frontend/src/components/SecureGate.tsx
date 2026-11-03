import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { ShieldCheck, LockKeyhole, Download, UploadCloud } from 'lucide-react'
import {
  createVault, unlockVault, lockVault, vaultExists, isVaultUnlocked,
  exportEncryptedBackup, importEncryptedBackup, subscribeVault
} from '../secureVault'

export default function SecureGate({children}:{children:ReactNode}) {
  const [ready,setReady]=useState(isVaultUnlocked())
  const [exists,setExists]=useState<boolean|null>(null)
  const [password,setPassword]=useState('')
  const [confirmation,setConfirmation]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)

  useEffect(()=>{
    const update=()=>{
      setReady(isVaultUnlocked())
      void vaultExists().then(setExists).catch(()=>setExists(null))
    }
    update()
    return subscribeVault(update)
  },[])

  async function submit(event:FormEvent){
    event.preventDefault()
    setError('')
    if(exists===null)return
    if(!exists && password!==confirmation){setError('Passphrases do not match.');return}
    setBusy(true)
    try{
      if(exists)await unlockVault(password)
      else await createVault(password)
      setPassword('');setConfirmation('')
      setReady(true)
    }catch(e){setError((e as Error).message)}
    finally{setBusy(false)}
  }
  async function restore(file:File|null){
    if(!file)return
    if(!password){setError('Enter the backup passphrase before importing.');return}
    if(exists && !window.confirm('Replace this browser vault with the selected encrypted backup? Existing case files on this device will be overwritten.')){
      return
    }
    setBusy(true);setError('')
    try{await importEncryptedBackup(file,password);setReady(true);setPassword('')}
    catch(e){setError((e as Error).message)}
    finally{setBusy(false)}
  }

  if(!ready) return (
    <section className="panel" style={{maxWidth:640,margin:'3rem auto',padding:'2rem'}}>
      <span className="eyebrow">ENCRYPTED CASE WORKSPACE · LOCAL DEVICE ONLY</span>
      <h1><LockKeyhole size={28} style={{verticalAlign:'middle',marginRight:10}}/> {exists?'Unlock your private case vault':'Create a private case vault'}</h1>
      <p>Your case records, uploaded evidence, drafts and progress are encrypted on this device with AES-256-GCM. Your passphrase never leaves this browser.</p>
      <p><strong>Important:</strong> This is not a cloud account. If you clear site data or lose your passphrase and backup, case files cannot be recovered. Other devices do not automatically sync.</p>
      <form onSubmit={submit} className="form-panel" style={{display:'grid',gap:16}}>
        <div className="field">
          <label htmlFor="pramaan-vault-password">Vault passphrase (12+ characters)</label>
          <input id="pramaan-vault-password" type="password" autoComplete={exists?'current-password':'new-password'} minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/>
        </div>
        {!exists && <div className="field">
          <label htmlFor="pramaan-confirm">Confirm passphrase</label>
          <input id="pramaan-confirm" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/>
        </div>}
        {error && <p role="alert" className="alert error">{error}</p>}
        <button type="submit" className="button primary" disabled={busy||exists===null}>
          <LockKeyhole size={17}/> {busy?'Securing browser vault…':exists?'Unlock private workspace':'Create encrypted workspace'}
        </button>
      </form>
      <div style={{borderTop:'1px solid #b3b3b350',paddingTop:18,marginTop:24}}>
        <label htmlFor="pramaan-backup" style={{display:'block',marginBottom:10}}>Restore encrypted backup (requires its passphrase)</label>
        <input id="pramaan-backup" type="file" accept=".json,application/json" disabled={busy} onChange={e=>{void restore(e.target.files?.[0]||null);e.target.value=''}}/>
        <p style={{marginTop:10,fontSize:13}}>Do not put evidence or case details into the public research search or AI assistant.</p>
      </div>
    </section>
  )

  return <>
    <div className="panel" role="status" style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',margin:'1rem 1.5rem',padding:14}}>
      <div><ShieldCheck size={19} style={{verticalAlign:'middle',marginRight:7}}/><strong>Private vault unlocked</strong>
      <div style={{fontSize:12}}>Encrypted IndexedDB on this browser. No cloud case sync. Back up regularly.</div></div>
      <div style={{display:'flex',gap:8}}>
        <button type="button" className="button secondary" onClick={()=>void exportEncryptedBackup().catch(e=>setError((e as Error).message))}><Download size={16}/> Backup</button>
        <button type="button" className="button secondary" onClick={lockVault}><LockKeyhole size={16}/> Lock</button>
      </div>
    </div>
    {error&&<div role="alert" className="alert error" style={{margin:'0 1.5rem'}}>{error}</div>}
    {children}
  </>
}
