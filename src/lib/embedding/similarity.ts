/**
 * Vector similarity calculation utilities
 */

/**
 * Calculate cosine similarity
 * @param a Vector A
 * @param b Vector B
 * @returns Similarity score from -1.0 to 1.0 (1.0 is most similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Convert Float32Array to Buffer (for DB storage)
 */
export function vectorToBuffer(vector: number[]): Buffer {
  const float32Array = new Float32Array(vector);
  return Buffer.from(float32Array.buffer);
}

/**
 * Convert Buffer to number[] (for DB retrieval)
 */
export function bufferToVector(buffer: Buffer): number[] {
  const float32Array = new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.length / Float32Array.BYTES_PER_ELEMENT
  );
  return Array.from(float32Array);
}

/**
 * Result sorted by similarity
 */
export interface SimilarityResult<T> {
  item: T;
  similarity: number;
}

/**
 * Sort items by similarity to query vector
 * @param query Query vector
 * @param items Items to search
 * @param getVector Function to get vector from item
 * @param topK Return top K results
 * @param threshold Similarity threshold (only return results above this)
 */
export function findSimilar<T>(
  query: number[],
  items: T[],
  getVector: (item: T) => number[],
  topK: number = 10,
  threshold: number = 0.0
): SimilarityResult<T>[] {
  const results: SimilarityResult<T>[] = items
    .map((item) => ({
      item,
      similarity: cosineSimilarity(query, getVector(item)),
    }))
    .filter((result) => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}
