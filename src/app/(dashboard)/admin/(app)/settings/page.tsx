import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { SettingsForm } from '@/dashboard/editors/SettingsForm'
import { loadDocumentMap, loadMediaMap, settingsFromDoc } from '@/cms/sync'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Site Settings' }

export default async function SettingsPage() {
  const u = await requireUser()
  const payload = await payloadClient()
  const doc = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }) as Record<string, any>
  const s = settingsFromDoc(doc, await loadMediaMap(payload), await loadDocumentMap(payload))
  const logoMedia = doc.logoMedia && typeof doc.logoMedia === 'object' ? doc.logoMedia.id : doc.logoMedia ?? null
  const ogMedia = doc.seoDefaults?.ogImageMedia && typeof doc.seoDefaults.ogImageMedia === 'object' ? doc.seoDefaults.ogImageMedia.id : doc.seoDefaults?.ogImageMedia ?? null
  const initial = { ...s, logoMedia, seoDefaults: { ...s.seoDefaults, ogImageMedia: ogMedia }, tracking: u.role === 'admin' ? s.tracking : { ga4Id: '', gtmId: '', metaPixelId: '', googleAdsId: '', adsPriceListLabel: '' } }
  return (
    <>
      <div className="pd-head"><div className="grow"><h1>Site Settings</h1><p className="pd-sub">Practice details and options that apply to the whole website.</p></div></div>
      <SettingsForm initial={initial} isAdmin={u.role === 'admin'} />
    </>
  )
}
