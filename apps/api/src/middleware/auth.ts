import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache auth_id → users table id mapping to avoid repeated lookups
const userIdCache = new Map<string, string>();

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Map auth user ID to users table ID (they can differ)
  let dbUserId = userIdCache.get(user.id);
  if (!dbUserId) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email!)
      .single();

    if (dbUser) {
      dbUserId = dbUser.id as string;
      userIdCache.set(user.id, dbUserId);
    } else {
      // No users table entry — use auth ID as fallback
      dbUserId = user.id;
    }
  }

  console.log(`Auth: ${user.email} | auth_id=${user.id} → db_id=${dbUserId}`);
  // Attach both IDs: auth_id for Supabase auth calls, id for DB queries
  (req as any).user = { ...user, id: dbUserId, auth_id: user.id };
  next();
}
