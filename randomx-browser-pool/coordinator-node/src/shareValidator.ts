// Placeholder share validator. In Phase 1 we do basic checks + toy difficulty.
// Phase 2: integrate server-side RandomX using the same JS library/WASM to fully verify.

type Ctx = {
  difficulty: number
}

export function validateShare(_ctx: Ctx, hashHex: string): boolean {
  // Toy difficulty: require hashHex to start with N zeros (N=difficulty)
  const prefix = '0'.repeat(_ctx.difficulty)
  return hashHex.startsWith(prefix)
}
