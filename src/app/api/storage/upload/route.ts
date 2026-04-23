import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const contentType = request.headers.get('content-type')
    
    // Pattern 1: JSON request for Signed Upload URL (Recommended for large files)
    if (contentType?.includes('application/json')) {
      const { bucket, path } = await request.json()
      
      if (!bucket || !path) {
        return NextResponse.json({ error: 'Bucket and Path are required' }, { status: 400 })
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return NextResponse.json({ 
        uploadUrl: data.signedUrl, 
        token: data.token,
        publicUrl 
      })
    }

    // Pattern 2: FormData (Legacy/Small files)
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'client-logos'

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    console.error('Storage Upload Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
