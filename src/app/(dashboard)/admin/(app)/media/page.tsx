import { payloadClient, requireUser } from '@/dashboard/lib/server'
import { MediaLibrary } from '@/dashboard/editors/MediaLibrary'
import sitePhotos from '@/generated/site-images.json'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Media Library' }

export default async function Media() {
  await requireUser()
  const payload = await payloadClient()
  const s = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true }) as Record<string, any>
  const reps = (s?.imageReplacements || []).map((r: Record<string, any>) => ({
    from: String(r.from), to: String(r.to || ''), media: r.media && typeof r.media === 'object' ? r.media.id : r.media ?? null,
  }))
  return (
    <>
      <div className="pd-head"><div className="grow"><h1>Media Library</h1><p className="pd-sub">Upload photos to use on pages and posts. Photos are resized and compressed automatically.</p></div></div>
      <MediaLibrary sitePhotos={sitePhotos as string[]} replacements={reps} />
    </>
  )
}
