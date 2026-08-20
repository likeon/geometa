import { describe, expect, test } from 'bun:test';
import { app } from '@api/api';
import { mapGroups, users } from '@api/lib/db/schema';
import { db } from '@api/lib/drizzle';

const syncedAt = 1700000000;

// int32 max: tests resequence ids from 1 (TRUNCATE ... RESTART IDENTITY), so
// no seeded group can ever reach this id - guaranteed missing within the file
const MISSING_GROUP_ID = 2_147_483_647;

async function seedUser(id: string, isSuperadmin = false) {
  await db.insert(users).values({ id, username: id, isSuperadmin });
}

function groupRequest(userId: string, groupId: number) {
  return app.handle(
    new Request(`http://localhost/api/internal/map-groups/${groupId}`, {
      method: 'GET',
      headers: { 'x-api-user-id': userId },
    }),
  );
}

describe('missing map-group response contract', () => {
  // Current behavior on a nonexistent group id: the handler gates on
  // ensurePermissions before any existence check. A plain user without a
  // permission row is rejected by the permission error catcher - 403 with
  // ["You don't have permissions for this"] - while a superadmin, treated as
  // implicit owner by getGroupRole, passes the guard, hits the existence
  // check, and gets the bare 404. The missing-group contract thus diverges by
  // caller role (auth-before-existence).
  // Desired contract: a missing group is role-independent - the canonical bare
  // 404 for every caller. 403 keeps its meaning of "group exists but you have
  // no access" (verified by the control group below).
  test.todo('missing group yields the same bare 404 for ordinary user and superadmin', async () => {
    await seedUser('missing-regular');
    await seedUser('missing-admin', true);

    const [regular, admin] = await Promise.all([
      groupRequest('missing-regular', MISSING_GROUP_ID),
      groupRequest('missing-admin', MISSING_GROUP_ID),
    ]);

    expect(regular.status).toBe(404);
    expect(admin.status).toBe(404);
    // both are the bare status(404): identical "Not Found" body
    expect(await regular.text()).toBe('Not Found');
    expect(await admin.text()).toBe('Not Found');

    // control: with a real group, role semantics stay intact so 404 keeps
    // meaning "missing" instead of masking authorization
    const [group] = await db
      .insert(mapGroups)
      .values({
        name: 'Contract control',
        syncedAt,
        syncIncludeLocationsNotOnStreetView: true,
      })
      .returning({ id: mapGroups.id });
    const [denied, allowed] = await Promise.all([
      groupRequest('missing-regular', group!.id),
      groupRequest('missing-admin', group!.id),
    ]);
    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
  });
});
