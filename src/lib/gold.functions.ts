import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { Wallet } from './gold';

// A guest wallet is a capability, not an anonymous Auth signup. The random
// secret never goes into database rows; only its SHA-256 digest is stored.
export const walletAction = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), action: z.enum(['load', 'skin', 'start', 'finish']), skin: z.string().max(20).optional(), match: z.string().uuid().optional() }).parse(input))
  .handler(async ({ data }) => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data.token));
    const tokenHash = Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
    // Authority is the verified unguessable wallet capability, never a client
    // supplied user ID. Privileged RPC is atomic and checks prices itself.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if ((data.action === 'start' || data.action === 'finish') && !data.match) throw new Error('Match required');
    const { data: result, error } = await supabaseAdmin.rpc('game_wallet_action', { p_hash: tokenHash, p_action: data.action, ...(data.skin ? { p_skin: data.skin } : {}), ...(data.match ? { p_match: data.match } : {}) });
    if (error) throw new Error('Gold could not be saved. Please try again.');
    return result as unknown as Wallet;
  });