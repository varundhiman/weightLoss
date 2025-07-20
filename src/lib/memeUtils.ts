import { supabase } from './supabase'

export interface MemeData {
  url: string
  name: string
  bucket: 'weight-loss-memes' | 'weight-gain-memes'
}

/**
 * Fetches a random meme from the specified bucket
 */
export const getRandomMeme = async (bucket: 'weight-loss-memes' | 'weight-gain-memes'): Promise<MemeData | null> => {
  try {
    // List all files in the bucket
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list('', {
        limit: 100,
        offset: 0
      })

    if (error) {
      console.error(`Error listing files from ${bucket}:`, error)
      return null
    }

    if (!files || files.length === 0) {
      console.warn(`No files found in ${bucket}`)
      return null
    }

    // Filter out folders and get only image files
    const imageFiles = files.filter(file => 
      file.name && 
      !file.name.includes('/') && 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
    )

    if (imageFiles.length === 0) {
      console.warn(`No image files found in ${bucket}`)
      return null
    }

    // Pick a random image
    const randomIndex = Math.floor(Math.random() * imageFiles.length)
    const selectedFile = imageFiles[randomIndex]

    // Get the public URL for the image
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(selectedFile.name)

    return {
      url: urlData.publicUrl,
      name: selectedFile.name,
      bucket
    }
  } catch (error) {
    console.error(`Error fetching random meme from ${bucket}:`, error)
    return null
  }
}

/**
 * Determines which bucket to use based on weight change
 */
export const getMemeForWeightChange = async (
  currentWeight: number,
  previousWeight: number | null
): Promise<MemeData | null> => {
  // If no previous weight, show weight-loss meme as encouragement
  if (previousWeight === null) {
    return getRandomMeme('weight-loss-memes')
  }

  // If lost weight, show weight-loss meme
  if (currentWeight < previousWeight) {
    return getRandomMeme('weight-loss-memes')
  }

  // If gained weight, show weight-gain meme
  return getRandomMeme('weight-gain-memes')
}

/**
 * Gets the most recent weight entry for a user
 */
export const getPreviousWeight = async (userId: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('weight_entries')
      .select('weight')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data.weight
  } catch (error) {
    console.error('Error fetching previous weight:', error)
    return null
  }
}